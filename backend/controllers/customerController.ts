import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Customer, CustomerStatus } from '../models/Customer.js';
import { Organization } from '../models/Organization.js';
import { Deal } from '../models/Deal.js';
import redisClient from '../config/redis.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { scoreCustomer } from '../utils/segmentRules.js';
import { invalidateDashboardCache } from './dashboardController.js';
import { assertEmail, assertString } from '../utils/validation.js';
import { emitEvent } from '../services/workflowEngine.js';

const CUSTOMER_STATUSES: CustomerStatus[] = ['lead', 'contacted', 'qualified', 'customer', 'churned'];

const validateStatus = (value: unknown): CustomerStatus => {
  if (value === undefined) return 'lead';
  if (typeof value === 'string' && CUSTOMER_STATUSES.includes(value as CustomerStatus)) {
    return value as CustomerStatus;
  }
  throw new AppError(`Invalid customer status: ${value}`, 400);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Clears the cached customer lists for the tenant.
 *
 * The organisation scoped cache key is derived from the same prefix, so both
 * the unscoped list and the filtered variant have to be removed. The previous
 * implementation deleted only the unscoped key, which left organisation
 * filtered lists stale for the whole TTL.
 */
const invalidateCustomerCache = async (
  businessId: string,
  organizationIds: Array<string | undefined> = []
): Promise<void> => {
  try {
    const keys = [`customers:${businessId}`];
    for (const organizationId of organizationIds) {
      if (organizationId) keys.push(`customers:${businessId}:${organizationId}`);
    }
    await redisClient.del(...keys);
  } catch (error) {
    logger.warn('Failed to invalidate customer cache', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'customerController',
    });
  }
};

// --------------------
// Create a new customer
// --------------------
export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const { name, email, phone, position, organizationId, customFields, status, source } = req.body;
  if (!name || !email) {
    throw new AppError('Customer name and email are required', 400);
  }

  const normalizedEmail = assertEmail(email);
  assertString(name, 'name', { min: 1, max: 200 });

  if (organizationId) {
    const orgExists = await Organization.findOne({ _id: organizationId, business: req.user.businessId });
    if (!orgExists) {
      throw new AppError('Organization not found for this business', 404);
    }
  }

  const customer = new Customer({
    name: name.trim(),
    email: normalizedEmail,
    phone: phone?.trim(),
    position: position?.trim(),
    organizationId: organizationId || undefined,
    status: validateStatus(status),
    source: source?.trim() || 'manual',
    customFields: customFields || {},
    business: req.user.businessId,
    createdBy: req.user.id,
  });

  const scoring = scoreCustomer({
    email: customer.email,
    totalSpend: customer.totalSpend,
    totalOrders: customer.totalOrders,
    organizationId: customer.organizationId,
  });
  customer.leadScore = scoring.score;
  customer.temperature = scoring.temperature;
  customer.leadScoreReasons = scoring.reasons;

  await customer.save();
  if (customer.organizationId) {
    await customer.populate('organizationId', 'name industry website');
  }

  await invalidateCustomerCache(req.user.businessId, [organizationId]);
  await invalidateDashboardCache(req.user.businessId);

  await recordAudit(
    auditContextFromRequest(req),
    'customer',
    String(customer._id),
    'create',
    [
      { field: 'name', to: customer.name },
      { field: 'email', to: customer.email },
      { field: 'status', to: customer.status },
    ],
    customer.name
  );

  logger.info('Customer created successfully', {
    customerId: customer._id,
    businessId: req.user.businessId,
    service: 'customerController',
  });

  emitEvent({
    event: 'customer.created',
    businessId: req.user.businessId,
    entity: 'customer',
    entityId: String(customer._id),
    doc: customer.toObject(),
    actor: { id: req.user.id, name: req.user.name || 'A team member', role: req.user.role },
  });

  res.status(201).json({ message: 'Customer created', customer });
});

// --------------------
// Get customers for the business
// --------------------
export const getCustomers = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const { organizationId, status, temperature, source, search } = req.query;
  const filter: Record<string, any> = { business: req.user.businessId };

  if (organizationId) filter.organizationId = organizationId;
  if (status && typeof status === 'string') filter.status = status;
  if (temperature && typeof temperature === 'string') filter.temperature = temperature;
  if (source && typeof source === 'string') filter.source = source;
  if (search && typeof search === 'string') {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
      { phone: { $regex: safe, $options: 'i' } },
    ];
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .populate('organizationId', 'name industry website')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Customer.countDocuments(filter),
  ]);

  res.json({
    customers,
    pagination: buildPaginationMeta(total, pagination),
  });
});

// --------------------
// Update customer
// --------------------
export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const customer = await Customer.findOne({ _id: id, business: businessId });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const before = customer.toObject();

  const { name, email, phone, position, organizationId, customFields, status, source, temperature } = req.body;

  if (name !== undefined) {
    customer.name = assertString(name, 'name', { min: 1, max: 200 }) as string;
  }
  if (email !== undefined) {
    customer.email = assertEmail(email);
  }
  if (phone !== undefined) customer.phone = phone?.trim();
  if (position !== undefined) customer.position = position?.trim();
  if (organizationId !== undefined) {
    if (organizationId) {
      const orgExists = await Organization.findOne({ _id: organizationId, business: businessId });
      if (!orgExists) throw new AppError('Organization not found for this business', 404);
    }
    customer.organizationId = organizationId || undefined;
  }
  if (customFields !== undefined) customer.customFields = customFields;
  if (status !== undefined) {
    const nextStatus = validateStatus(status);
    customer.status = nextStatus;
    if (nextStatus === 'customer' && !customer.convertedAt) {
      customer.convertedAt = new Date();
    }
  }
  if (source !== undefined) customer.source = source?.trim() || 'manual';
  if (temperature !== undefined) {
    if (!['cold', 'warm', 'hot'].includes(String(temperature))) {
      throw new AppError(`Invalid temperature: ${temperature}`, 400);
    }
    customer.temperature = temperature;
  }

  const scoring = scoreCustomer({
    email: customer.email,
    totalSpend: customer.totalSpend,
    totalOrders: customer.totalOrders,
    organizationId: customer.organizationId,
  });
  customer.leadScore = scoring.score;
  customer.temperature = temperature !== undefined ? customer.temperature : scoring.temperature;
  customer.leadScoreReasons = scoring.reasons;

  await customer.save();
  await customer.populate('organizationId', 'name industry website');

  await invalidateCustomerCache(businessId, [
    before.organizationId ? String(before.organizationId) : undefined,
    organizationId,
  ]);
  await invalidateDashboardCache(businessId);

  const changes = diffRecords(before, customer.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'customer',
    String(customer._id),
    'update',
    changes,
    customer.name
  );

  const actor = {
    id: req.user?.id,
    name: req.user?.name || 'A team member',
    role: req.user?.role,
  };

  emitEvent({
    event: 'customer.updated',
    businessId,
    entity: 'customer',
    entityId: String(customer._id),
    doc: customer.toObject(),
    previous: { status: before.status },
    actor,
  });

  if (before.status !== customer.status) {
    emitEvent({
      event: 'customer.status_changed',
      businessId,
      entity: 'customer',
      entityId: String(customer._id),
      doc: customer.toObject(),
      previous: { status: before.status },
      actor,
    });
  }

  res.json({ message: 'Customer updated successfully', customer });
});

// --------------------
// Delete customer
// --------------------
export const deleteCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const customer = await Customer.findOne({ _id: id, business: businessId });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  await customer.deleteOne();

  await invalidateCustomerCache(businessId, [
    customer.organizationId ? String(customer.organizationId) : undefined,
  ]);
  await invalidateDashboardCache(businessId);

  await recordAudit(
    auditContextFromRequest(req),
    'customer',
    String(id),
    'delete',
    [{ field: 'name', from: customer.name }],
    customer.name
  );

  res.json({ message: 'Customer deleted successfully' });
});

// --------------------
// Lead view: leads only, grouped by temperature
// --------------------
export const getLeads = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { temperature, status, source } = req.query;
  const filter: Record<string, any> = {
    business: businessId,
    status: { $in: ['lead', 'contacted', 'qualified'] },
  };

  if (temperature && typeof temperature === 'string') filter.temperature = temperature;
  if (status && typeof status === 'string') filter.status = status;
  if (source && typeof source === 'string') filter.source = source;

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [leads, total, summary] = await Promise.all([
    Customer.find(filter)
      .populate('organizationId', 'name industry website')
      .sort({ leadScore: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Customer.countDocuments(filter),
    Customer.aggregate([
      { $match: { business: new Types.ObjectId(businessId), status: { $in: ['lead', 'contacted', 'qualified'] } } },
      {
        $group: {
          _id: '$temperature',
          count: { $sum: 1 },
          totalSpend: { $sum: '$totalSpend' },
          averageScore: { $avg: '$leadScore' },
        },
      },
    ]),
  ]);

  const buckets: Record<string, { count: number; totalSpend: number; averageScore: number }> = {
    hot: { count: 0, totalSpend: 0, averageScore: 0 },
    warm: { count: 0, totalSpend: 0, averageScore: 0 },
    cold: { count: 0, totalSpend: 0, averageScore: 0 },
  };
  for (const row of summary) {
    if (row._id in buckets) {
      buckets[row._id] = {
        count: row.count,
        totalSpend: row.totalSpend,
        averageScore: Math.round(row.averageScore || 0),
      };
    }
  }

  res.json({
    leads,
    pagination: buildPaginationMeta(total, pagination),
    summary: buckets,
  });
});

// --------------------
// Convert a lead into a customer
// --------------------
export const convertLead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const customer = await Customer.findOne({ _id: id, business: businessId });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }
  if (customer.status === 'customer') {
    throw new AppError('This contact is already a converted customer', 409);
  }

  const before = customer.toObject();

  customer.status = 'customer';
  customer.convertedAt = new Date();
  customer.temperature = 'hot';
  customer.leadScore = Math.max(customer.leadScore, 60);

  await customer.save();

  await invalidateCustomerCache(businessId, [
    customer.organizationId ? String(customer.organizationId) : undefined,
  ]);
  await invalidateDashboardCache(businessId);

  const changes = diffRecords(before, customer.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'customer',
    String(customer._id),
    'update',
    changes,
    `${customer.name} converted`
  );

  emitEvent({
    event: 'customer.converted',
    businessId,
    entity: 'customer',
    entityId: String(customer._id),
    doc: customer.toObject(),
    previous: { status: before.status },
    actor: { id: req.user?.id, name: req.user?.name || 'A team member', role: req.user?.role },
  });

  res.json({ message: 'Lead converted to customer', customer });
});

// --------------------
// Rescore a contact using the scoring policy
// --------------------
export const rescoreCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const customer = await Customer.findOne({ _id: id, business: businessId });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const scoring = scoreCustomer({
    email: customer.email,
    totalSpend: customer.totalSpend,
    totalOrders: customer.totalOrders,
    organizationId: customer.organizationId,
  });

  customer.leadScore = scoring.score;
  customer.temperature = scoring.temperature;
  customer.leadScoreReasons = scoring.reasons;
  await customer.save();

  await invalidateCustomerCache(businessId);

  res.json({
    message: 'Lead score recalculated',
    customer,
    reasons: scoring.reasons,
  });
});

// --------------------
// Overview for a single contact: deals, orders and notes
// --------------------
export const getCustomerOverview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const customer = await Customer.findOne({ _id: id, business: businessId })
    .populate('organizationId', 'name industry website');
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  const [deals, organization] = await Promise.all([
    Deal.find({ customerId: customer._id, business: businessId })
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 }),
    customer.organizationId
      ? Organization.findOne({ _id: customer.organizationId, business: businessId })
      : null,
  ]);

  res.json({ customer, deals, organization });
});

export default {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getLeads,
  convertLead,
  rescoreCustomer,
  getCustomerOverview,
};
