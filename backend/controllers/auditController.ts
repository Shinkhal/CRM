import { Request, Response } from 'express';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';

const AUDIT_ENTITIES = [
  'deal',
  'customer',
  'organization',
  'task',
  'note',
  'campaign',
  'order',
  'pipeline',
  'user',
];

/**
 * Field level change history for one record, or a tenant wide activity feed.
 * This is the equivalent of HubSpot's property history and Frappe's `Version`
 * trail.
 */
export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { entity, entityId, action, actor } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (entity && typeof entity === 'string') {
    if (!AUDIT_ENTITIES.includes(entity)) {
      throw new AppError(`Unknown audit entity: ${entity}`, 400);
    }
    filter.entity = entity;
  }
  if (entityId && typeof entityId === 'string') filter.entityId = entityId;
  if (action && typeof action === 'string') {
    if (!['create', 'update', 'delete'].includes(action)) {
      throw new AppError(`Unknown audit action: ${action}`, 400);
    }
    filter.action = action;
  }
  if (actor && typeof actor === 'string') filter.actor = actor;

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [entries, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    AuditLog.countDocuments(filter),
  ]);

  res.json({ entries, pagination: buildPaginationMeta(total, pagination) });
});

/**
 * Compact audit trail for a single record, used by the deal drawer to show
 * "what changed" next to the note timeline.
 */
export const getEntityHistory = asyncHandler(async (req: Request, res: Response) => {
  const entity = String(req.params.entity);
  const entityId = String(req.params.entityId);
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }
  if (!AUDIT_ENTITIES.includes(entity)) {
    throw new AppError(`Unknown audit entity: ${entity}`, 400);
  }

  const entries = await AuditLog.find({ business: businessId, entity, entityId })
    .populate('actor', 'name email role')
    .sort({ createdAt: -1 })
    .limit(100);

  res.json(entries);
});

export default { getAuditLogs, getEntityHistory };
