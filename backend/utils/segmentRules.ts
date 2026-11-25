import { AppError } from './errorHandler.js';

/**
 * Campaign segmentation uses a vendor-neutral rule DSL rather than raw Mongo
 * operators.
 *
 *   { "totalSpend": { "gte": 1000 }, "createdAt": { "lt": "2026-01-01" } }
 *
 * This matters because the request sanitizer deliberately strips every key that
 * starts with `$` (a NoSQL injection defence). Sending `$gte` in a request body
 * therefore never reached the controller. Keeping operators unprefixed means the
 * payload survives sanitisation unchanged while the operator surface stays
 * closed: only the fields and operators listed here are ever translated into a
 * Mongo query.
 */

export const SEGMENT_OPERATORS = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'in', 'nin', 'exists'] as const;
export type SegmentOperator = (typeof SEGMENT_OPERATORS)[number];

export const SEGMENT_FIELDS = [
  'name',
  'email',
  'phone',
  'position',
  'totalSpend',
  'totalOrders',
  'lastOrderDate',
  'createdAt',
] as const;
export type SegmentField = (typeof SEGMENT_FIELDS)[number];

const NUMERIC_FIELDS: SegmentField[] = ['totalSpend', 'totalOrders'];
const DATE_FIELDS: SegmentField[] = ['lastOrderDate', 'createdAt'];
const TEXT_FIELDS: SegmentField[] = ['name', 'email', 'phone', 'position'];

export type SegmentRuleSet = Partial<Record<SegmentField, Partial<Record<SegmentOperator, any>>>>;

const MONGO_OPERATOR: Record<SegmentOperator, string> = {
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  eq: '$eq',
  ne: '$ne',
  in: '$in',
  nin: '$nin',
  exists: '$exists',
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Accepts either the canonical unprefixed DSL or a legacy `$`-prefixed payload
 * and returns the canonical unprefixed form. Legacy input is normalised here so
 * older clients keep working, but it is never passed to Mongo untouched.
 */
export const normalizeSegmentRules = (input: unknown): SegmentRuleSet => {
  if (!isPlainObject(input)) {
    throw new AppError('segmentRules must be an object', 400);
  }

  const normalized: SegmentRuleSet = {};

  for (const [rawField, rawCondition] of Object.entries(input)) {
    const field = rawField.replace(/^\$/, '') as SegmentField;
    if (!SEGMENT_FIELDS.includes(field)) {
      throw new AppError(`Unsupported segment field: ${rawField}`, 400);
    }
    if (!isPlainObject(rawCondition)) {
      throw new AppError(`Segment field ${field} must map operators to values`, 400);
    }

    const conditions: Record<string, any> = {};
    for (const [rawOperator, value] of Object.entries(rawCondition)) {
      const operator = rawOperator.replace(/^\$/, '') as SegmentOperator;
      if (!SEGMENT_OPERATORS.includes(operator)) {
        throw new AppError(`Unsupported segment operator: ${rawOperator}`, 400);
      }
      conditions[operator] = value;
    }
    normalized[field] = conditions as any;
  }

  return normalized;
};

/**
 * Translates a canonical rule set into a Mongo query fragment scoped to the
 * `Customer` collection. Every value is coerced and validated against the
 * declared type of its field, so a malformed rule fails loudly instead of
 * silently matching nothing.
 */
export const buildSegmentQuery = (rules: SegmentRuleSet): Record<string, any> => {
  const query: Record<string, any> = {};

  for (const [field, conditions] of Object.entries(rules)) {
    if (!conditions) continue;

    const mongoField = field as SegmentField;
    const clause: Record<string, any> = {};

    for (const [operator, rawValue] of Object.entries(conditions)) {
      const mongoOperator = MONGO_OPERATOR[operator as SegmentOperator];
      if (!mongoOperator) {
        throw new AppError(`Unsupported segment operator: ${operator}`, 400);
      }

      if (operator === 'exists') {
        clause[mongoOperator] = Boolean(rawValue);
        continue;
      }

      if (operator === 'in' || operator === 'nin') {
        if (!Array.isArray(rawValue) || rawValue.length === 0) {
          throw new AppError(`Operator ${operator} requires a non-empty array`, 400);
        }
        clause[mongoOperator] = rawValue.map((entry) => coerceSegmentValue(mongoField, entry));
        continue;
      }

      clause[mongoOperator] = coerceSegmentValue(mongoField, rawValue);
    }

    if (Object.keys(clause).length > 0) {
      query[mongoField] = clause;
    }
  }

  return query;
};

const coerceSegmentValue = (field: SegmentField, value: unknown): any => {
  if (NUMERIC_FIELDS.includes(field)) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      throw new AppError(`Invalid numeric value for segment field ${field}`, 400);
    }
    return numeric;
  }

  if (DATE_FIELDS.includes(field)) {
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) {
      throw new AppError(`Invalid date value for segment field ${field}`, 400);
    }
    return date;
  }

  if (TEXT_FIELDS.includes(field)) {
    if (typeof value !== 'string') {
      throw new AppError(`Segment field ${field} expects a string value`, 400);
    }
    return value;
  }

  return value;
};

/**
 * Scores a customer the way a sales team would: engagement and value raise the
 * score, a personal email address lowers it. Returns a 0-100 score and the
 * matching cold/warm/hot band.
 */
export const scoreCustomer = (customer: {
  email?: string;
  totalSpend?: number;
  totalOrders?: number;
  organizationId?: unknown;
}): { score: number; temperature: 'cold' | 'warm' | 'hot'; reasons: string[] } => {
  let score = 0;
  const reasons: string[] = [];

  const email = (customer.email || '').toLowerCase();
  const isBusinessEmail =
    email.includes('@') &&
    !/gmail|yahoo|hotmail|outlook|icloud|proton(mail)?|aol/i.test(email.split('@')[1] || '');

  if (isBusinessEmail) {
    score += 25;
    reasons.push('Business email address (+25)');
  } else if (email) {
    score += 5;
    reasons.push('Personal email address (+5)');
  }

  if (customer.organizationId) {
    score += 20;
    reasons.push('Linked to a company account (+20)');
  }

  const orders = Number(customer.totalOrders || 0);
  const spend = Number(customer.totalSpend || 0);

  if (orders >= 3) {
    score += 25;
    reasons.push('3+ completed orders (+25)');
  } else if (orders >= 1) {
    score += 12;
    reasons.push('At least 1 completed order (+12)');
  }

  if (spend >= 10000) {
    score += 20;
    reasons.push('High lifetime spend (+20)');
  } else if (spend >= 1000) {
    score += 10;
    reasons.push('Meaningful lifetime spend (+10)');
  }

  const bounded = Math.max(0, Math.min(100, score));
  const temperature: 'cold' | 'warm' | 'hot' = bounded >= 60 ? 'hot' : bounded >= 30 ? 'warm' : 'cold';

  return { score: bounded, temperature, reasons };
};
