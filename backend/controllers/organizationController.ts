import { Request, Response } from 'express';
import { Organization } from '../models/Organization.js';
import { Customer } from '../models/Customer.js';
import { Deal } from '../models/Deal.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { assertNumber, assertString } from '../utils/validation.js';

/** Escapes user input before it is used as a Mongo regular expression. */
const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getOrganizations = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { search, industry } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (search && typeof search === 'string') {
    const safe = escapeRegex(search);
    filter.$or = [
      { name: { $regex: safe, $options: 'i' } },
      { website: { $regex: safe, $options: 'i' } },
      { email: { $regex: safe, $options: 'i' } },
    ];
  }

  if (industry && typeof industry === 'string' && industry !== 'all') {
    filter.industry = industry;
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [organizations, total] = await Promise.all([
    Organization.find(filter)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Organization.countDocuments(filter),
  ]);

  // Attach linked customer and deal counts
  const orgIds = organizations.map((o) => o._id);
  const [customerCounts, dealAggregates] = await Promise.all([
    Customer.aggregate([
      { $match: { organizationId: { $in: orgIds }, business: businessId } },
      { $group: { _id: '$organizationId', count: { $sum: 1 } } },
    ]),
    Deal.aggregate([
      { $match: { organizationId: { $in: orgIds }, business: businessId } },
      { $group: { _id: '$organizationId', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
    ]),
  ]);

  const customerCountMap = new Map(customerCounts.map((c) => [c._id.toString(), c.count]));
  const dealMap = new Map(
    dealAggregates.map((d) => [d._id.toString(), { count: d.count, totalValue: d.totalValue }])
  );

  const enhancedOrgs = organizations.map((org) => {
    const orgObj = org.toObject();
    const orgIdStr = org._id.toString();
    return {
      ...orgObj,
      customerCount: customerCountMap.get(orgIdStr) || 0,
      dealCount: dealMap.get(orgIdStr)?.count || 0,
      totalDealValue: dealMap.get(orgIdStr)?.totalValue || 0,
    };
  });

  res.json({ organizations: enhancedOrgs, pagination: buildPaginationMeta(total, pagination) });
});

export const getOrganizationById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const organization = await Organization.findOne({ _id: id, business: businessId })
    .populate('createdBy', 'name email');

  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  const [contacts, deals] = await Promise.all([
    Customer.find({ organizationId: id, business: businessId }).sort({ createdAt: -1 }),
    Deal.find({ organizationId: id, business: businessId }).sort({ createdAt: -1 }),
  ]);

  res.json({
    organization,
    contacts,
    deals,
  });
});

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const {
    name,
    website,
    industry,
    employeeCount,
    annualRevenue,
    phone,
    email,
    address,
    customFields,
  } = req.body;

  const organizationName = assertString(name, 'name', { min: 1, max: 200 });

  const organization = new Organization({
    name: organizationName,
    website: assertString(website, 'website', { optional: true, max: 300 }),
    industry: assertString(industry, 'industry', { optional: true, max: 120 }) || 'General',
    // A non-numeric value used to become 0 silently, so a typo in the
    // headcount was stored as "no employees" and reported as a 200.
    employeeCount: assertNumber(employeeCount, 'employeeCount', { optional: true, min: 0 }) ?? 0,
    annualRevenue: assertNumber(annualRevenue, 'annualRevenue', { optional: true, min: 0 }) ?? 0,
    phone: assertString(phone, 'phone', { optional: true, max: 40 }),
    email: assertString(email, 'email', { optional: true, max: 254 }),
    address: address || {},
    customFields: customFields || {},
    business: businessId,
    createdBy: userId,
  });

  await organization.save();

  await recordAudit(
    auditContextFromRequest(req),
    'organization',
    String(organization._id),
    'create',
    [{ field: 'name', to: organization.name }],
    organization.name
  );

  logger.info('Organization created', {
    organizationId: organization._id,
    businessId,
    service: 'organizationController',
  });

  res.status(201).json({ message: 'Organization created successfully', organization });
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const organization = await Organization.findOne({ _id: id, business: businessId });
  if (!organization) {
    throw new AppError('Organization not found', 404);
  }

  const {
    name,
    website,
    industry,
    employeeCount,
    annualRevenue,
    phone,
    email,
    address,
    customFields,
  } = req.body;

  const before = organization.toObject();

  if (name !== undefined) organization.name = assertString(name, 'name', { min: 1, max: 200 }) as string;
  if (website !== undefined) organization.website = assertString(website, 'website', { optional: true, max: 300 });
  if (industry !== undefined) organization.industry = assertString(industry, 'industry', { optional: true, max: 120 });
  if (employeeCount !== undefined) {
    organization.employeeCount = assertNumber(employeeCount, 'employeeCount', { min: 0 }) as number;
  }
  if (annualRevenue !== undefined) {
    organization.annualRevenue = assertNumber(annualRevenue, 'annualRevenue', { min: 0 }) as number;
  }
  if (phone !== undefined) organization.phone = assertString(phone, 'phone', { optional: true, max: 40 });
  if (email !== undefined) organization.email = assertString(email, 'email', { optional: true, max: 254 });
  if (address !== undefined) organization.address = address;
  if (customFields !== undefined) organization.customFields = customFields;

  await organization.save();

  await recordAudit(
    auditContextFromRequest(req),
    'organization',
    String(organization._id),
    'update',
    diffRecords(before, organization.toObject()),
    organization.name
  );

  logger.info('Organization updated', {
    organizationId: organization._id,
    businessId,
    service: 'organizationController',
  });

  res.json({ message: 'Organization updated successfully', organization });
});

export const deleteOrganization = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const deleted = await Organization.findOneAndDelete({ _id: id, business: businessId });
  if (!deleted) {
    throw new AppError('Organization not found', 404);
  }

  await recordAudit(
    auditContextFromRequest(req),
    'organization',
    String(id),
    'delete',
    [{ field: 'name', from: deleted.name }],
    deleted.name
  );

  // Unset organizationId on any associated customers or deals
  await Promise.all([
    Customer.updateMany({ organizationId: id, business: businessId }, { $unset: { organizationId: 1 } }),
    Deal.updateMany({ organizationId: id, business: businessId }, { $unset: { organizationId: 1 } }),
  ]);

  logger.info('Organization deleted', {
    organizationId: id,
    businessId,
    service: 'organizationController',
  });

  res.json({ message: 'Organization deleted successfully' });
});

export default {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
};
