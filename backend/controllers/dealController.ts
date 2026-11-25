import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Deal } from '../models/Deal.js';
import { Customer } from '../models/Customer.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import {
  assertStageExists,
  getDefaultPipeline,
  resolvePipeline,
  toStageMap,
} from '../services/pipelineService.js';
import { PipelineDocument } from '../models/Pipeline.js';
import { emitEvent } from '../services/workflowEngine.js';
import { assertNumber, assertString } from '../utils/validation.js';
import { Business, ICustomFieldDefinition } from '../models/business.js';

/**
 * Enforces the `required` flag on the tenant's custom field definitions.
 * A definition that is marked required has to be present on the record,
 * otherwise the write is rejected with a 400 that names the missing field.
 */
const assertRequiredCustomFields = async (
  businessId: string,
  values: Record<string, any> | undefined
): Promise<void> => {
  const business = await Business.findById(businessId).select('settings.customFields');
  const definitions = (business?.settings?.customFields || []).filter(
    (definition: ICustomFieldDefinition) =>
      definition.entity === 'deal' && definition.required
  );

  const missing = definitions
    .filter((definition: ICustomFieldDefinition) => {
      const value = values?.[definition.key];
      return value === undefined || value === null || value === '';
    })
    .map((definition: ICustomFieldDefinition) => definition.label);

  if (missing.length > 0) {
    throw new AppError(`Missing required field(s): ${missing.join(', ')}`, 400);
  }
};

const DEAL_PRIORITIES = ['low', 'medium', 'high'];

const validatePriority = (value: unknown): 'low' | 'medium' | 'high' => {
  if (value === undefined) return 'medium';
  if (typeof value === 'string' && DEAL_PRIORITIES.includes(value)) {
    return value as 'low' | 'medium' | 'high';
  }
  throw new AppError(`Invalid priority: ${value}`, 400);
};

// --------------------
// List deals
// --------------------
export const getDeals = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { stage, priority, organizationId, assignedTo, customerId, search } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (stage && typeof stage === 'string') filter.stage = stage;
  if (priority && typeof priority === 'string') filter.priority = priority;
  if (organizationId && typeof organizationId === 'string') filter.organizationId = organizationId;
  if (assignedTo && typeof assignedTo === 'string') filter.assignedTo = assignedTo;
  if (customerId && typeof customerId === 'string') filter.customerId = customerId;
  if (search && typeof search === 'string') {
    const safe = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.title = { $regex: safe, $options: 'i' };
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [deals, total] = await Promise.all([
    Deal.find(filter)
      .populate('customerId', 'name email phone totalSpend')
      .populate('organizationId', 'name industry website')
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Deal.countDocuments(filter),
  ]);

  res.json({
    deals,
    pagination: buildPaginationMeta(total, pagination),
  });
});

// --------------------
// Pipeline summary
// --------------------
export const getPipelineSummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pipeline = await getDefaultPipeline(businessId, req.user?.id);
  const stageMap = toStageMap(pipeline);

  /**
   * A single aggregation replaces the previous "load every deal into Node and
   * loop" implementation. `$facet` keeps the stage breakdown and the totals in
   * one round trip.
   */
  const [result] = await Deal.aggregate([
    { $match: { business: new Types.ObjectId(businessId) } },
    {
      $facet: {
        stages: [
          {
            $group: {
              _id: '$stage',
              count: { $sum: 1 },
              totalValue: { $sum: '$value' },
              weightedValue: {
                $sum: { $multiply: ['$value', { $divide: [{ $ifNull: ['$probability', 0] }, 100] }] },
              },
            },
          },
        ],
        byOwner: [
          {
            $group: {
              _id: '$assignedTo',
              count: { $sum: 1 },
              totalValue: { $sum: '$value' },
              weightedValue: {
                $sum: { $multiply: ['$value', { $divide: [{ $ifNull: ['$probability', 0] }, 100] }] },
              },
            },
          },
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalPipelineValue: { $sum: '$value' },
              weightedForecast: {
                $sum: { $multiply: ['$value', { $divide: [{ $ifNull: ['$probability', 0] }, 100] }] },
              },
              totalDeals: { $sum: 1 },
              wonCount: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
              wonValue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] } },
              lostCount: { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, 1, 0] } },
              lostValue: { $sum: { $cond: [{ $eq: ['$stage', 'lost'] }, '$value', 0] } },
            },
          },
        ],
      },
    },
  ]);

  const stageBreakdown: Record<string, { count: number; totalValue: number; weightedValue: number }> = {};
  for (const stage of pipeline.stages) {
    stageBreakdown[stage.key] = { count: 0, totalValue: 0, weightedValue: 0 };
  }
  for (const row of result?.stages || []) {
    stageBreakdown[row._id] = {
      count: row.count,
      totalValue: row.totalValue,
      weightedValue: Math.round(row.weightedValue),
    };
  }

  const lostReasons = await Deal.aggregate([
    { $match: { business: new Types.ObjectId(businessId), stage: 'lost' } },
    { $group: { _id: { $ifNull: ['$lostReason', 'Unspecified'] }, count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
    { $sort: { totalValue: -1 } },
  ]);

  const totals = result?.totals?.[0] || {};
  const closedCount = (totals.wonCount || 0) + (totals.lostCount || 0);
  const winRate = closedCount > 0 ? Math.round(((totals.wonCount || 0) / closedCount) * 100) : 0;
  const activeDeals = (totals.totalDeals || 0) - closedCount;

  const byOwner = (result?.byOwner || [])
    .filter((row: any) => row._id)
    .map((row: any) => ({
      ownerId: row._id,
      count: row.count,
      totalValue: row.totalValue,
      weightedValue: Math.round(row.weightedValue),
    }))
    .sort((a: any, b: any) => b.weightedValue - a.weightedValue);

  res.json({
    pipelineId: pipeline._id,
    pipelineName: pipeline.name,
    stages: pipeline.stages.map((s) => ({ ...s, ...stageBreakdown[s.key] })),
    stageBreakdown,
    totalPipelineValue: totals.totalPipelineValue || 0,
    weightedForecast: Math.round(totals.weightedForecast || 0),
    winRate,
    wonCount: totals.wonCount || 0,
    wonValue: totals.wonValue || 0,
    lostCount: totals.lostCount || 0,
    lostValue: totals.lostValue || 0,
    activeDeals,
    totalDeals: totals.totalDeals || 0,
    byOwner,
    lostReasons: lostReasons.map((row: any) => ({
      reason: row._id,
      count: row.count,
      totalValue: row.totalValue,
    })),
    stageTypes: stageMap,
  });
});

// --------------------
// Time based forecast
// --------------------
export const getForecast = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const months = Math.min(24, Math.max(1, Number.parseInt(String(req.query.months || '6'), 10) || 6));
  const granularity = req.query.granularity === 'quarter' ? 'quarter' : 'month';

  const pipeline = await getDefaultPipeline(businessId, req.user?.id);
  const wonStage = pipeline.stages.find((s) => s.type === 'won');
  const lostStage = pipeline.stages.find((s) => s.type === 'lost');

  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));

  const rows = await Deal.aggregate([
    {
      $match: {
        business: new Types.ObjectId(businessId),
        expectedCloseDate: { $gte: start, $exists: true },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$expectedCloseDate' } },
        count: { $sum: 1 },
        pipelineValue: { $sum: '$value' },
        weightedValue: {
          $sum: { $multiply: ['$value', { $divide: [{ $ifNull: ['$probability', 0] }, 100] }] },
        },
        wonValue: {
          $sum: {
            $cond: [{ $eq: ['$stage', wonStage?.key || 'won'] }, '$value', 0],
          },
        },
        lostValue: {
          $sum: {
            $cond: [{ $eq: ['$stage', lostStage?.key || 'lost'] }, '$value', 0],
          },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const monthKeyToQuarter = (key: string): string => {
    const [year, month] = key.split('-').map(Number);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}-Q${quarter}`;
  };

  const buckets = new Map<string, any>();
  const ensureBucket = (key: string) => {
    if (!buckets.has(key)) {
      buckets.set(key, { period: key, count: 0, pipelineValue: 0, weightedValue: 0, wonValue: 0, lostValue: 0 });
    }
    return buckets.get(key);
  };

  for (const row of rows) {
    const key = granularity === 'quarter' ? monthKeyToQuarter(row._id) : row._id;
    const bucket = ensureBucket(key);
    bucket.count += row.count;
    bucket.pipelineValue += row.pipelineValue;
    bucket.weightedValue += Math.round(row.weightedValue);
    bucket.wonValue += row.wonValue;
    bucket.lostValue += row.lostValue;
  }

  // Emit an empty bucket for every period in range so the chart has a stable axis.
  const periods: string[] = [];
  const cursor = new Date(start);
  if (granularity === 'quarter') {
    for (let i = 0; i < months; i++) {
      const quarter = Math.floor(cursor.getUTCMonth() / 3) + 1;
      const key = `${cursor.getUTCFullYear()}-Q${quarter}`;
      if (!periods.includes(key)) periods.push(key);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  } else {
    for (let i = 0; i < months; i++) {
      periods.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}`);
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  for (const period of periods) ensureBucket(period);

  const forecast = [...buckets.values()].sort((a, b) => a.period.localeCompare(b.period));

  res.json({
    granularity,
    from: start.toISOString(),
    months,
    pipelineId: pipeline._id,
    forecast,
    totals: {
      pipelineValue: forecast.reduce((sum, b) => sum + b.pipelineValue, 0),
      weightedValue: forecast.reduce((sum, b) => sum + b.weightedValue, 0),
      wonValue: forecast.reduce((sum, b) => sum + b.wonValue, 0),
      lostValue: forecast.reduce((sum, b) => sum + b.lostValue, 0),
      dealCount: forecast.reduce((sum, b) => sum + b.count, 0),
    },
  });
});

// --------------------
// Create a deal
// --------------------
export const createDeal = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;

  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const {
    title,
    customerId,
    organizationId,
    value = 0,
    stage,
    pipelineId,
    probability,
    expectedCloseDate,
    priority,
    notes = '',
    customFields,
    assignedTo,
  } = req.body;

  if (!title || !customerId) {
    throw new AppError('title and customerId are required', 400);
  }
  assertString(title, 'title', { min: 1, max: 300 });
  assertNumber(value, 'value', { optional: true, min: 0 });

  const customerExists = await Customer.findOne({ _id: customerId, business: businessId });
  if (!customerExists) {
    throw new AppError('Customer not found for this business', 404);
  }

  const pipeline = await resolvePipeline(businessId, pipelineId, userId);
  const stageKey = stage || pipeline.stages[0]?.key || 'lead';
  const stageDefinition = assertStageExists(pipeline, stageKey);

  if (stageDefinition.type === 'lost' && !req.body.lostReason) {
    throw new AppError('A lost deal requires a lost reason', 400);
  }

  const derivedProbability =
    probability === undefined || probability === null || probability === ''
      ? stageDefinition.probability
      : Number(probability);
  if (!Number.isFinite(derivedProbability) || derivedProbability < 0 || derivedProbability > 100) {
    throw new AppError('probability must be a number between 0 and 100', 400);
  }

  await assertRequiredCustomFields(businessId, customFields);

  const deal = new Deal({
    title,
    customerId,
    organizationId: organizationId || customerExists.organizationId || undefined,
    value: Number(value) || 0,
    stage: stageKey,
    pipelineId: pipeline._id,
    probability: derivedProbability,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
    closedDate: stageDefinition.type === 'won' ? new Date() : undefined,
    priority: validatePriority(priority),
    notes,
    lostReason: req.body.lostReason,
    lostNotes: req.body.lostNotes,
    customFields: customFields || {},
    assignedTo: assignedTo || undefined,
    business: businessId,
    createdBy: userId,
    stageHistory: [
      {
        stage: stageKey,
        changedAt: new Date(),
        changedBy: userId as any,
      },
    ],
  });

  await deal.save();
  await deal.populate('customerId', 'name email phone');
  if (deal.organizationId) {
    await deal.populate('organizationId', 'name industry website');
  }

  await recordAudit(
    auditContextFromRequest(req),
    'deal',
    String(deal._id),
    'create',
    [
      { field: 'title', to: deal.title },
      { field: 'value', to: deal.value },
      { field: 'stage', to: deal.stage },
    ],
    deal.title
  );

  logger.info('Deal created successfully', {
    dealId: deal._id,
    businessId,
    value: deal.value,
    service: 'dealController',
  });

  emitEvent({
    event: 'deal.created',
    businessId,
    entity: 'deal',
    entityId: String(deal._id),
    doc: deal.toObject(),
    actor: { id: req.user?.id, name: req.user?.name || 'A team member', role: req.user?.role },
  });

  res.status(201).json({ message: 'Deal created successfully', deal });
});

// --------------------
// Update a deal
// --------------------
export const updateDeal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const deal = await Deal.findOne({ _id: id, business: businessId });
  if (!deal) {
    throw new AppError('Deal not found', 404);
  }

  const before = deal.toObject();

  const {
    title,
    customerId,
    organizationId,
    value,
    stage,
    pipelineId,
    probability,
    expectedCloseDate,
    priority,
    notes,
    lostReason,
    lostNotes,
    customFields,
    assignedTo,
  } = req.body;

  const pipeline: PipelineDocument = await resolvePipeline(
    businessId,
    pipelineId || (deal.pipelineId ? String(deal.pipelineId) : undefined),
    req.user?.id
  );

  if (title !== undefined) deal.title = title;
  if (organizationId !== undefined) deal.organizationId = organizationId || undefined;
  if (value !== undefined) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) throw new AppError('value must be a number', 400);
    deal.value = numeric;
  }
  if (expectedCloseDate !== undefined) {
    deal.expectedCloseDate = expectedCloseDate ? new Date(expectedCloseDate) : undefined;
  }
  if (priority !== undefined) deal.priority = validatePriority(priority);
  if (notes !== undefined) deal.notes = notes;
  if (customFields !== undefined) deal.customFields = customFields;
  if (assignedTo !== undefined) deal.assignedTo = assignedTo || undefined;
  if (pipelineId !== undefined) deal.pipelineId = pipeline._id as Types.ObjectId;

  if (customerId && customerId !== String(deal.customerId)) {
    const customerExists = await Customer.findOne({ _id: customerId, business: businessId });
    if (!customerExists) {
      throw new AppError('Customer not found', 404);
    }
    deal.customerId = customerId;
  }

  const previousStage = deal.stage;
  const previousProbability = deal.probability;

  if (stage && stage !== deal.stage) {
    const stageDefinition = assertStageExists(pipeline, stage);

    if (stageDefinition.type === 'lost') {
      const reason = lostReason ?? deal.lostReason;
      if (!reason) {
        throw new AppError('A lost deal requires a lost reason', 400);
      }
      deal.lostReason = reason;
      deal.closedDate = new Date();
    } else {
      // Moving out of a lost stage clears the loss analysis.
      deal.lostReason = undefined;
      deal.lostNotes = undefined;
      deal.closedDate = stageDefinition.type === 'won' ? new Date() : undefined;
    }

    deal.stage = stage;
    deal.stageHistory.push({
      stage,
      changedAt: new Date(),
      changedBy: req.user?.id as any,
    });

    // The stage carries the forecast weight unless the caller overrides it.
    if (probability === undefined) {
      deal.probability = stageDefinition.probability;
    }
  }

  if (lostReason !== undefined) deal.lostReason = lostReason;
  if (lostNotes !== undefined) deal.lostNotes = lostNotes;

  if (probability !== undefined) {
    const numeric = Number(probability);
    if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100) {
      throw new AppError('probability must be a number between 0 and 100', 400);
    }
    deal.probability = numeric;
  }

  await assertRequiredCustomFields(businessId, deal.customFields);

  await deal.save();
  await deal.populate('customerId', 'name email phone');
  await deal.populate('organizationId', 'name industry website');
  await deal.populate('assignedTo', 'name email');

  const changes = diffRecords(before, deal.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'deal',
    String(deal._id),
    'update',
    changes,
    deal.title
  );

  const actor = {
    id: req.user?.id,
    name: req.user?.name || 'A team member',
    role: req.user?.role,
  };

  emitEvent({
    event: 'deal.updated',
    businessId,
    entity: 'deal',
    entityId: String(deal._id),
    doc: deal.toObject(),
    previous: { stage: previousStage, probability: previousProbability },
    actor,
  });

  if (previousStage !== deal.stage) {
    const stageDefinition = pipeline.stages.find((entry) => entry.key === deal.stage);

    emitEvent({
      event: 'deal.stage_changed',
      businessId,
      entity: 'deal',
      entityId: String(deal._id),
      doc: deal.toObject(),
      previous: { stage: previousStage, probability: previousProbability },
      actor,
    });

    if (stageDefinition?.type === 'won') {
      emitEvent({
        event: 'deal.won',
        businessId,
        entity: 'deal',
        entityId: String(deal._id),
        doc: deal.toObject(),
        previous: { stage: previousStage },
        actor,
      });
    }

    if (stageDefinition?.type === 'lost') {
      emitEvent({
        event: 'deal.lost',
        businessId,
        entity: 'deal',
        entityId: String(deal._id),
        doc: deal.toObject(),
        previous: { stage: previousStage },
        actor,
      });
    }
  }

  logger.info('Deal updated successfully', {
    dealId: deal._id,
    newStage: deal.stage,
    service: 'dealController',
  });

  res.json({ message: 'Deal updated successfully', deal });
});

// --------------------
// Delete a deal
// --------------------
export const deleteDeal = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const deal = await Deal.findOne({ _id: id, business: businessId });
  if (!deal) {
    throw new AppError('Deal not found', 404);
  }

  await deal.deleteOne();

  await recordAudit(
    auditContextFromRequest(req),
    'deal',
    String(id),
    'delete',
    [{ field: 'title', from: deal.title }],
    deal.title
  );

  logger.info('Deal deleted successfully', {
    dealId: id,
    businessId,
    service: 'dealController',
  });

  res.json({ message: 'Deal deleted successfully' });
});

export default {
  getDeals,
  getPipelineSummary,
  getForecast,
  createDeal,
  updateDeal,
  deleteDeal,
};
