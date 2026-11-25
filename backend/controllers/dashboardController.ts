import { Request, Response } from 'express';
import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Campaign } from '../models/Campaign.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { generateGrowthInsights } from '../services/aiService.js';
import redisClient from '../config/redis.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Clears the cached dashboard aggregates. Customer and order writes change
 * revenue and contact counts, so a stale cache would show the old numbers
 * for the whole TTL.
 */
export const invalidateDashboardCache = async (businessId: string): Promise<void> => {
  try {
    await redisClient.del(`dashboard:summary:${businessId}`);
  } catch (error) {
    logger.warn('Failed to invalidate dashboard cache', {
      businessId,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'dashboardController',
    });
  }
};

// ---------------------------
// Dashboard Summary (Admins, Managers, Viewers)
// ---------------------------
export const getDashboardSummary = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;

  if (!businessId) {
    throw new AppError('No business associated with user', 400);
  }

  const cacheKey = `dashboard:summary:${businessId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached && typeof cached === 'string') {
    return res.json({ source: 'cache', ...JSON.parse(cached) });
  }

  /**
   * The aggregates are counted in the database. The previous implementation
   * loaded four whole collections into memory on every cache miss, which is
   * O(tenant) memory and O(tenant) time for six numbers.
   */
  const [customerCount, orderCount, campaignCount, logCount, revenueResult, logStatusResult] =
    await Promise.all([
      Customer.countDocuments({ business: businessId }),
      Order.countDocuments({ business: businessId }),
      Campaign.countDocuments({ business: businessId }),
      CommunicationLog.countDocuments({ business: businessId }),
      Order.aggregate([
        { $match: { business: businessId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CommunicationLog.aggregate([
        { $match: { business: businessId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

  const statusCounts: Record<string, number> = {};
  for (const row of logStatusResult) {
    statusCounts[row._id] = row.count;
  }

  const summary = {
    totalCustomers: customerCount,
    totalOrders: orderCount,
    totalRevenue: revenueResult[0]?.total || 0,
    totalCampaigns: campaignCount,
    totalMessages: logCount,
    messagesSent: statusCounts.SENT || 0,
    messagesFailed: statusCounts.FAILED || 0,
  };

  await (redisClient as any).set(cacheKey, JSON.stringify(summary), { ex: 300 });

  res.json({ source: 'db', ...summary });
});

// ---------------------------
// Growth Insights (Admins only)
// ---------------------------
export const getGrowthInsights = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const role = req.user?.role;

  if (!businessId) {
    throw new AppError('No business associated with user', 400);
  }

  if (role !== 'admin') {
    throw new AppError('Only admins can access growth insights', 403);
  }

  const cacheKey = `dashboard:insights:${businessId}`;
  const cached = await redisClient.get(cacheKey);
  if (cached && typeof cached === 'string') {
    return res.json({ source: 'cache', ...JSON.parse(cached) });
  }

  const queryTimeout = 10000; // 10 seconds

  /**
   * The model only ever sees a sample. The previous implementation loaded
   * every record in the tenant into memory and then threw almost all of it
   * away, which made the endpoint scale with the size of the workspace.
   */
  const SAMPLE_SIZE = 20;
  const [customers, orders, campaigns, logs, counts] = await Promise.allSettled([
    Customer.aggregate([
      { $match: { business: businessId } },
      { $sample: { size: SAMPLE_SIZE } },
    ]).option({ maxTimeMS: queryTimeout }),
    Order.aggregate([
      { $match: { business: businessId } },
      { $sample: { size: SAMPLE_SIZE } },
    ]).option({ maxTimeMS: queryTimeout }),
    Campaign.aggregate([
      { $match: { business: businessId } },
      { $sample: { size: SAMPLE_SIZE } },
    ]).option({ maxTimeMS: queryTimeout }),
    CommunicationLog.aggregate([
      { $match: { business: businessId } },
      { $sample: { size: SAMPLE_SIZE } },
    ]).option({ maxTimeMS: queryTimeout }),
    Promise.all([
      Customer.countDocuments({ business: businessId }),
      Order.countDocuments({ business: businessId }),
      Campaign.countDocuments({ business: businessId }),
      CommunicationLog.countDocuments({ business: businessId }),
    ]),
  ]);

  const failedQueries = [customers, orders, campaigns, logs, counts]
    .map((result, i) => ({
      result,
      name: ['customers', 'orders', 'campaigns', 'logs', 'counts'][i],
    }))
    .filter(({ result }) => result.status === 'rejected');

  if (failedQueries.length > 0) {
    logger.error('Database query failures in growth insights', {
      failed: failedQueries.map((q) => q.name),
      service: 'dashboardController',
    });
    throw new AppError('Failed to fetch data from database', 500);
  }

  const customerData = (customers as PromiseFulfilledResult<any[]>).value || [];
  const orderData = (orders as PromiseFulfilledResult<any[]>).value || [];
  const campaignData = (campaigns as PromiseFulfilledResult<any[]>).value || [];
  const logData = (logs as PromiseFulfilledResult<any[]>).value || [];

  const [customerCount, orderCount, campaignCount, logCount] = (
    counts as PromiseFulfilledResult<number[]>
  ).value || [0, 0, 0, 0];

  const totalRecords = customerCount + orderCount + campaignCount + logCount;
  if (totalRecords === 0) {
    const emptyResponse = {
      insights: [
        'Start by adding your first customers to build a foundation for growth insights',
        'Create your first marketing campaign to begin tracking engagement',
        'Record customer interactions to identify communication patterns',
      ],
    };
    // The empty result was returned without being cached, so every request
    // re-queried the database.
    await (redisClient as any).set(cacheKey, JSON.stringify(emptyResponse), { ex: 900 });
    return res.json({ source: 'db', ...emptyResponse });
  }

  const insights = await generateGrowthInsights(customerData, orderData, campaignData, logData);

  const response = {
    insights,
    metadata: {
      dataPoints: {
        customers: customerCount,
        orders: orderCount,
        campaigns: campaignCount,
        logs: logCount,
      },
      sampleSize: {
        customers: customerData.length,
        orders: orderData.length,
        campaigns: campaignData.length,
        logs: logData.length,
      },
      generatedAt: new Date().toISOString(),
    },
  };

  await (redisClient as any).set(cacheKey, JSON.stringify(response), { ex: 900 });

  res.json({ source: 'db', ...response });
});

export default { getDashboardSummary, getGrowthInsights, invalidateDashboardCache };
