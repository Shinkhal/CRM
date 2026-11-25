import { Request, Response } from 'express';
import { Order } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import redisClient from '../config/redis.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { scoreCustomer } from '../utils/segmentRules.js';
import { invalidateDashboardCache } from './dashboardController.js';

// Create Order
export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const { customerId, amount } = req.body;
  if (!customerId || amount === undefined || isNaN(Number(amount))) {
    throw new AppError('customerId and a valid numeric amount are required', 400);
  }

  const numericAmount = Number(amount);

  const order = new Order({
    customerId,
    amount: numericAmount,
    business: req.user.businessId,
    createdBy: req.user.id,
  });
  await order.save();

  /**
   * The counters are incremented atomically. A read-modify-write lost an
   * update whenever two orders for the same contact were placed at the same
   * time: both requests read the same total and the second write discarded
   * the first order's revenue.
   */
  const updated = await Customer.findOneAndUpdate(
    { _id: customerId, business: req.user.businessId },
    {
      $inc: { totalSpend: numericAmount, totalOrders: 1 },
      $set: { lastOrderDate: new Date() },
    },
    { new: true }
  );

  if (updated) {
    // A completed order is strong buying signal, so the lead score is
    // recalculated instead of left stale.
    const scoring = scoreCustomer({
      email: updated.email,
      totalSpend: updated.totalSpend,
      totalOrders: updated.totalOrders,
      organizationId: updated.organizationId,
    });
    await Customer.updateOne(
      { _id: updated._id },
      {
        $set: {
          leadScore: scoring.score,
          temperature: scoring.temperature,
          leadScoreReasons: scoring.reasons,
        },
      }
    );
  }

  // Invalidate cache for all team members
  try {
    await redisClient.del(`orders:${req.user.businessId}`);
  } catch (error) {
    logger.warn('Order saved but cache invalidation failed', { error: error instanceof Error ? error.message : String(error) });
  }
  await invalidateDashboardCache(req.user.businessId);

  logger.info('Order created successfully', {
    orderId: order._id,
    businessId: req.user.businessId,
    amount: numericAmount,
    service: 'orderController',
  });

  res.status(201).json({ message: 'Order created', order });
});

// Get Orders for Business
export const getOrders = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.businessId) {
    throw new AppError('Unauthorized: missing business association', 401);
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [orders, total] = await Promise.all([
    Order.find({ business: req.user.businessId })
      .populate('customerId', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Order.countDocuments({ business: req.user.businessId }),
  ]);

  logger.debug('Orders fetched from MongoDB', {
    businessId: req.user.businessId,
    count: orders.length,
    service: 'orderController',
  });

  res.json({ orders, pagination: buildPaginationMeta(total, pagination) });
});

export default { createOrder, getOrders };
