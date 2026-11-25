import { Request } from 'express';
import { isDeepStrictEqual } from 'node:util';
import { AuditLog, AuditAction, AuditEntity, IAuditChange } from '../models/AuditLog.js';
import { logger } from './logger.js';

const TRACKED_FIELD_LIMIT = 25;

/**
 * A value is worth recording when it carries information. Empty strings and
 * null are not, but objects and arrays are: `stageHistory` and `customFields`
 * are the fields a reviewer most often needs.
 */
const isTrackable = (value: unknown): boolean => {
  if (value === undefined) return false;
  if (value === null) return true;
  if (typeof value === 'string') return value.length > 0;
  return true;
};

const stringify = (value: unknown): any => {
  if (value === undefined || value === null) return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return value;
};

const isEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  if (a === null || b === null) return false;
  if (typeof a === 'object' || typeof b === 'object') {
    return isDeepStrictEqual(a, b);
  }
  return String(a) === String(b);
};

/**
 * Builds the field-level diff between two versions of a record. Only fields
 * that actually changed are recorded, which keeps the audit trail readable.
 *
 * Object and array fields are compared structurally. They used to be skipped
 * entirely, which meant the stage transition history and the custom field
 * values never appeared in the audit trail even though they were the most
 * audit-worthy changes a CRM makes.
 */
export const diffRecords = (before: Record<string, any>, after: Record<string, any>): IAuditChange[] => {
  const changes: IAuditChange[] = [];
  const fields = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);

  for (const field of fields) {
    if (field.startsWith('_') || field === 'updatedAt' || field === '__v') {
      continue;
    }
    if (!isTrackable(after?.[field]) && !isTrackable(before?.[field])) continue;

    const previous = before?.[field];
    const next = after?.[field];

    if (isEqual(previous, next)) continue;

    changes.push({ field, from: stringify(previous), to: stringify(next) });
    if (changes.length >= TRACKED_FIELD_LIMIT) break;
  }

  return changes;
};

export interface AuditContext {
  businessId: string;
  userId?: string;
  role?: string;
  ip?: string;
  userAgent?: string;
}

export const auditContextFromRequest = (req: Request): AuditContext => ({
  businessId: String(req.user?.businessId || ''),
  userId: req.user?.id ? String(req.user.id) : undefined,
  role: req.user?.role,
  ip: req.ip,
  userAgent: req.headers['user-agent'] as string | undefined,
});

/**
 * Records an audit entry. Audit failures are logged but never fail the
 * originating request: losing history must not break a customer-facing write.
 */
export const recordAudit = async (
  context: AuditContext,
  entity: AuditEntity,
  entityId: string,
  action: AuditAction,
  changes: IAuditChange[] = [],
  label?: string
): Promise<void> => {
  if (!context.businessId || !entityId) return;

  try {
    await AuditLog.create({
      entity,
      entityId,
      action,
      label,
      changes,
      actor: context.userId,
      actorRole: context.role,
      ip: context.ip,
      userAgent: context.userAgent,
      business: context.businessId,
    });
  } catch (error) {
    logger.warn('Failed to record audit entry', {
      entity,
      entityId,
      action,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'audit',
    });
  }
};

export default { diffRecords, recordAudit, auditContextFromRequest };
