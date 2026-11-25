import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Customer } from '../models/Customer.js';
import { Deal } from '../models/Deal.js';
import { Organization } from '../models/Organization.js';
import { Task } from '../models/Task.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const PER_ENTITY_LIMIT = 5;

/**
 * Cross entity search. The command palette in the shell calls this so a
 * search covers contacts, deals, accounts and tasks in one round trip instead
 * of the static navigation list it used to render.
 */
export const globalSearch = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const raw = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!raw) {
    throw new AppError('q is required', 400);
  }
  if (raw.length < 2) {
    throw new AppError('q must be at least 2 characters', 400);
  }

  const safe = escapeRegex(raw);
  const regex = { $regex: safe, $options: 'i' };
  const businessObjectId = new Types.ObjectId(businessId);

  const [customers, deals, organizations, tasks] = await Promise.all([
    Customer.find({ business: businessObjectId, $or: [{ name: regex }, { email: regex }, { phone: regex }] })
      .select('name email phone position status temperature organizationId')
      .limit(PER_ENTITY_LIMIT),
    Deal.find({ business: businessObjectId, $or: [{ title: regex }, { notes: regex }] })
      .select('title stage value probability expectedCloseDate customerId')
      .limit(PER_ENTITY_LIMIT),
    Organization.find({ business: businessObjectId, $or: [{ name: regex }, { website: regex }, { industry: regex }] })
      .select('name industry website employeeCount')
      .limit(PER_ENTITY_LIMIT),
    Task.find({ business: businessObjectId, $or: [{ title: regex }, { description: regex }] })
      .select('title status priority dueDate relatedDeal relatedCustomer')
      .limit(PER_ENTITY_LIMIT),
  ]);

  res.json({
    query: raw,
    total: customers.length + deals.length + organizations.length + tasks.length,
    results: {
      customers,
      deals,
      organizations,
      tasks,
    },
  });
});

export default { globalSearch };
