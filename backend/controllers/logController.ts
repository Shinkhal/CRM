import { CampaignDelivery } from '../models/CampaignDelivery.js';
import { Request, Response } from 'express';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { Campaign } from '../models/Campaign.js';
import { Customer } from '../models/Customer.js';
import { Business } from '../models/business.js';
import { EmailTemplate } from '../models/EmailTemplate.js';
import { Suppression } from '../models/Suppression.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { verifyUnsubscribeToken } from '../utils/unsubscribeToken.js';
import { buildSegmentQuery, normalizeSegmentRules } from '../utils/segmentRules.js';

/**
 * The largest audience a single send may address.
 */
const MAX_AUDIENCE_SIZE = 5000;

const DEFAULT_SUBJECT = 'An update from us';
export const simulateCampaignDelivery = asyncHandler(async (req: Request, res: Response) => {
  const { campaignId } = req.body;
  const businessId = req.user?.businessId;
  if (!businessId) throw new AppError('Unauthorized: missing business context', 401);
  if (!campaignId) throw new AppError('campaignId is required', 400);
  const campaign = await Campaign.findOne({ _id: campaignId, business: businessId });
  if (!campaign) throw new AppError('Campaign not found for your business', 404);
  const existing = await CampaignDelivery.findById(campaign._id).select('status');
  if (existing) {
    res.status(202).json({ message: 'Campaign already queued', jobId: existing._id, status: existing.status });
    return;
  }
  if (campaign.status === 'sent' || await CommunicationLog.exists({ campaignId: campaign._id })) {
    throw new AppError('This campaign has already been sent. Create a new campaign to send again.', 409);
  }
  const rules = normalizeSegmentRules(campaign.segmentRules);
  const customers = await Customer.find({ business: businessId, ...buildSegmentQuery(rules) })
    .select('_id name email totalSpend totalOrders').limit(MAX_AUDIENCE_SIZE + 1);
  if (!customers.length) throw new AppError('This campaign no longer matches any contacts', 400);
  if (customers.length > MAX_AUDIENCE_SIZE) throw new AppError('Campaign audience exceeds 5000 contacts; narrow the segment.', 400);
  const business = await Business.findById(businessId).select('name');
  const template = campaign.templateId
    ? await EmailTemplate.findOne({ _id: campaign.templateId, business: businessId }) : null;
  if (campaign.templateId && !template) throw new AppError('Campaign template no longer exists', 400);
  const subject = template?.subject || campaign.subject || DEFAULT_SUBJECT;
  const body = template?.body || campaign.message;
  if (!body) throw new AppError('Save a campaign message before sending', 400);
  // The campaign id is also the job id: concurrent submissions cannot create duplicate jobs.
  try {
    await CampaignDelivery.updateOne({ _id: campaign._id }, { $setOnInsert: {
      business: businessId, userId: req.user!.id, companyName: business?.name || 'Your Company',
      subject, body, recipients: customers.map(c => ({ customerId: c._id, email: c.email,
        name: c.name, totalSpend: c.totalSpend, totalOrders: c.totalOrders, state: 'pending' })),
      status: 'queued',
    } }, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
  await Campaign.updateOne({ _id: campaign._id, status: { $in: ['draft', 'scheduled'] } }, { $set: { status: 'queued' } });
  res.status(202).json({ message: 'Campaign queued for delivery', jobId: campaign._id, status: 'queued' });
});

export const updateDeliveryReceipt = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { logId, status, vendorResponse } = req.body;
  if (!logId) {
    throw new AppError('logId is required', 400);
  }
  if (!['SENT', 'FAILED', 'PENDING', 'SKIPPED'].includes(status)) {
    throw new AppError(`Invalid delivery status: ${status}`, 400);
  }

  const updated = await CommunicationLog.findOneAndUpdate(
    {
      _id: logId,
      business: req.user.businessId,
    },
    {
      status,
      vendorResponse,
    },
    {
      new: true,
    }
  );

  if (!updated) {
    throw new AppError('Log not found for your business', 404);
  }

  res.status(200).json({ message: 'Delivery status updated.', log: updated });
});

export const getLogsByCampaign = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { campaignId } = req.params;

  const campaign = await Campaign.findOne({
    _id: campaignId,
    business: req.user.businessId,
  }).select('_id');

  if (!campaign) {
    throw new AppError('Campaign not found for your business', 404);
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [logs, total] = await Promise.all([
    CommunicationLog.find({
      campaignId,
      business: req.user.businessId,
    })
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    CommunicationLog.countDocuments({ campaignId, business: req.user.businessId }),
  ]);

  res.json({ logs, pagination: buildPaginationMeta(total, pagination) });
});

/**
 * Public endpoint behind the one-click unsubscribe link. The token is an HMAC
 * over the tenant and address, so the request is self authenticating.
 */
export const unsubscribe = asyncHandler(async (req: Request, res: Response) => {
  const { business: businessId, email, token } = req.query;

  if (
    !businessId ||
    typeof businessId !== 'string' ||
    !email ||
    typeof email !== 'string' ||
    !token ||
    typeof token !== 'string'
  ) {
    throw new AppError('business, email and token are required', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  /**
   * The tenant comes from the link and the token is bound to that tenant, so
   * only one tenant is ever loaded. The previous implementation loaded every
   * business in the deployment and computed one HMAC per tenant on an
   * unauthenticated route.
   */
  const business = await Business.findById(businessId).select('_id');
  if (!business || !verifyUnsubscribeToken(String(business._id), normalizedEmail, token)) {
    throw new AppError('This unsubscribe link is not valid', 400);
  }

  await Suppression.updateOne(
    { business: business._id, email: normalizedEmail },
    {
      $setOnInsert: {
        email: normalizedEmail,
        reason: 'unsubscribe',
        source: 'one-click',
        business: business._id,
      },
    },
    { upsert: true }
  );

  logger.info('Recipient unsubscribed', {
    businessId: String(business._id),
    service: 'logController',
  });

  res.json({ message: 'You have been unsubscribed. You will not receive further campaign emails.' });
});

/**
 * Lists the suppression list for the tenant.
 */
export const getSuppressionList = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [entries, total] = await Promise.all([
    Suppression.find({ business: businessId })
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Suppression.countDocuments({ business: businessId }),
  ]);

  res.json({ entries, pagination: buildPaginationMeta(total, pagination) });
});

/**
 * Adds an address to the suppression list by hand. A one-click unsubscribe
 * is the normal path, but a bouncing or complaining address has to be
 * suppressible without waiting for a recipient to act.
 */
export const addSuppression = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { email, reason = 'manual' } = req.body;
  if (!email || typeof email !== 'string') {
    throw new AppError('email is required', 400);
  }
  if (!['unsubscribe', 'bounce', 'complaint', 'manual'].includes(reason)) {
    throw new AppError(`Invalid suppression reason: ${reason}`, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  await Suppression.updateOne(
    { business: businessId, email: normalizedEmail },
    {
      $setOnInsert: {
        email: normalizedEmail,
        reason,
        source: 'manual',
        business: businessId,
        createdBy: req.user?.id,
      },
    },
    { upsert: true }
  );

  res.status(201).json({ message: 'Address added to the suppression list' });
});

export const removeSuppression = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const removed = await Suppression.findOneAndDelete({ _id: id, business: businessId });
  if (!removed) {
    throw new AppError('Suppression entry not found', 404);
  }

  res.json({ message: 'Contact removed from the suppression list' });
});

export default {
  simulateCampaignDelivery,
  updateDeliveryReceipt,
  getLogsByCampaign,
  unsubscribe,
  getSuppressionList,
  addSuppression,
  removeSuppression,
};
