import { CampaignDelivery } from '../models/CampaignDelivery.js';
import { assertString } from '../utils/validation.js';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.js';
import { Customer } from '../models/Customer.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { buildSegmentQuery, normalizeSegmentRules } from '../utils/segmentRules.js';
import { auditContextFromRequest, recordAudit } from '../utils/audit.js';

const PREVIEW_LIMIT = 50;

/**
 * The largest audience a single campaign may address. Without a ceiling a
 * segment that matched the whole tenant loaded every contact into memory and
 * queued every one of them for an email.
 */
const MAX_AUDIENCE_SIZE = 5000;

/**
 * Resolves the audience for a segment rule set without creating anything.
 * Used by the campaign builder preview and by the AI segmentation flow.
 */
const resolveAudience = async (businessId: string, rawRules: unknown) => {
  const rules = normalizeSegmentRules(rawRules);
  const query = { business: businessId, ...buildSegmentQuery(rules) };
  return { rules, query };
};

// --------------------
// Preview the audience for a segment rule set
// --------------------
export const previewCampaign = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { segmentRules } = req.body;
  if (!segmentRules) {
    throw new AppError('segmentRules is required', 400);
  }

  const { query } = await resolveAudience(businessId, segmentRules);

  const [total, sample] = await Promise.all([
    Customer.countDocuments(query),
    Customer.find(query)
      .select('name email totalSpend totalOrders lastOrderDate createdAt status temperature')
      .sort({ totalSpend: -1 })
      .limit(PREVIEW_LIMIT),
  ]);

  res.json({ total, sample, truncated: total > sample.length });
});

// --------------------
// Create a campaign
// --------------------
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { name, segmentRules, message, subject, templateId } = req.body;
  const userId = req.user?.id;
  const businessId = req.user?.businessId;

  if (!userId || !businessId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  if (!name || !segmentRules || !message) {
    throw new AppError('Missing required fields: name, segmentRules, message', 400);
  }

  assertString(message, 'message', { min: 1, max: 50000 });
  assertString(name, 'name', { min: 1, max: 160 });
  assertString(subject, 'subject', { optional: true, max: 200 });
  const { rules, query } = await resolveAudience(businessId, segmentRules);

  const audienceSize = await Customer.countDocuments(query);
  const customers = await Customer.find(query)
    .select('_id name email totalSpend totalOrders')
    .limit(MAX_AUDIENCE_SIZE);

  const campaign = new Campaign({
    name,
    segmentRules: rules,
    audienceSize,
    subject: subject || name,
    message,
    templateId: templateId || undefined,
    status: 'draft',
    createdBy: userId,
    userId,
    business: businessId,
  });

  await campaign.save();

  await recordAudit(
    auditContextFromRequest(req),
    'campaign',
    String(campaign._id),
    'create',
    [
      { field: 'name', to: campaign.name },
      { field: 'audienceSize', to: campaign.audienceSize },
    ],
    campaign.name
  );

  logger.info('Campaign created successfully', {
    campaignId: campaign._id,
    businessId,
    audienceSize: customers.length,
    service: 'campaignController',
  });

  res.status(201).json({
    message: 'Campaign created successfully',
    campaign,
    // A capped preview. The recipient list is resolved again on the server
    // when the campaign is sent, so the full audience is never shipped to
    // the browser.
    customers,
    truncated: audienceSize > customers.length,
  });
});

// --------------------
// List campaigns
// --------------------
export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [campaigns, total] = await Promise.all([
    Campaign.find({ business: req.user.businessId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Campaign.countDocuments({ business: req.user.businessId }),
  ]);

  res.json({ campaigns, pagination: buildPaginationMeta(total, pagination) });
});

// --------------------
// Per campaign delivery statistics
// --------------------
export const getCampaignStats = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  /**
   * The per campaign counts are aggregated in the database. The previous
   * implementation loaded every campaign and every delivery log of the tenant
   * into memory to count them.
   */
  const campaigns = await Campaign.find({ business: businessId }).sort({ createdAt: -1 });
  const campaignIds = campaigns.map((c) => c._id);

  const aggregated =
    campaignIds.length > 0
      ? await CommunicationLog.aggregate([
          { $match: { business: new mongoose.Types.ObjectId(businessId), campaignId: { $in: campaignIds } } },
          { $group: { _id: { campaign: '$campaignId', status: '$status' }, count: { $sum: 1 } } },
        ])
      : [];

  const counts: Record<string, Record<string, number>> = {};
  for (const row of aggregated) {
    const campaignId = String(row._id.campaign);
    if (!counts[campaignId]) counts[campaignId] = {};
    counts[campaignId][row._id.status] = row.count;
  }

  const stats = campaigns.map((campaign) => {
    const byStatus = counts[campaign._id.toString()] || {};
    const sent = byStatus.SENT || 0;
    const unknown = byStatus.UNKNOWN || 0;
    const failed = byStatus.FAILED || 0;
    const skipped = byStatus.SKIPPED || 0;
    const total = sent + failed + skipped + unknown;
    const successRate = sent + failed > 0 ? Math.round((sent / (sent + failed)) * 100) : 0;

    return {
      ...campaign.toObject(),
      sent,
      unknown,
      failed,
      skipped,
      total,
      successRate,
    };
  });

  res.json(stats);
});

// --------------------
// Update a campaign
// --------------------
export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const campaign = await Campaign.findOne({ _id: id, business: businessId });
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  if (await CampaignDelivery.exists({ _id: campaign._id })) throw new AppError('A queued campaign cannot be edited', 409);
  const { name, subject, message, status, segmentRules } = req.body;
  assertString(message, 'message', { optional: true, min: 1, max: 50000 });
  assertString(subject, 'subject', { optional: true, max: 200 });

  if (name !== undefined) campaign.name = name;
  if (subject !== undefined) campaign.subject = subject;
  if (message !== undefined) campaign.message = message;
  if (status !== undefined) {
    if (!['draft', 'scheduled'].includes(status)) {
      throw new AppError(`Invalid campaign status: ${status}`, 400);
    }
    campaign.status = status;
  }
  if (segmentRules !== undefined) {
    const { rules, query } = await resolveAudience(businessId, segmentRules);
    campaign.segmentRules = rules;
    campaign.audienceSize = await Customer.countDocuments(query);
  }

  await campaign.save();

  res.json({ message: 'Campaign updated successfully', campaign });
});

// --------------------
// Delete a campaign
// --------------------
export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const campaign = await Campaign.findOne({ _id: id, business: businessId });
  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  if (await CampaignDelivery.exists({ _id: campaign._id, status: 'queued' })) throw new AppError('A campaign with pending delivery cannot be deleted', 409);
  await CommunicationLog.deleteMany({ campaignId: campaign._id, business: businessId });
  await campaign.deleteOne();

  await recordAudit(
    auditContextFromRequest(req),
    'campaign',
    String(id),
    'delete',
    [{ field: 'name', from: campaign.name }],
    campaign.name
  );

  res.json({ message: 'Campaign deleted successfully' });
});

export default {
  previewCampaign,
  createCampaign,
  getCampaigns,
  getCampaignStats,
  updateCampaign,
  deleteCampaign,
};
