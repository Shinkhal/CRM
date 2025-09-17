import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Campaign } from '../models/Campaign.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { generateGrowthInsights } from '../services/aiService.js';
import redisClient from '../config/redis.js';

// ---------------------------
// Dashboard Summary (Admins, Managers, Viewers)
// ---------------------------
export const getDashboardSummary = async (req, res) => {
  try {
    const { businessId, role } = req.user;

    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with user' });
    }

    const cacheKey = `dashboard:summary:${businessId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", ...JSON.parse(cached) });
    }

    // Fetch all business data
    const [customers, orders, campaigns, logs] = await Promise.all([
      Customer.find({ business: businessId }),
      Order.find({ business: businessId }),
      Campaign.find({ business: businessId }),
      CommunicationLog.find({ business: businessId }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);
    const totalMessages = logs.length;
    const messagesSent = logs.filter(l => l.status === 'SENT').length;
    const messagesFailed = logs.filter(l => l.status === 'FAILED').length;

    const summary = {
      totalCustomers: customers.length,
      totalOrders: orders.length,
      totalRevenue,
      totalCampaigns: campaigns.length,
      totalMessages,
      messagesSent,
      messagesFailed,
    };

    await redisClient.setEx(cacheKey, 300, JSON.stringify(summary));

    res.json({ source: "db", ...summary });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

// ---------------------------
// Growth Insights (Admins only)
// ---------------------------
export const getGrowthInsights = async (req, res) => {
  try {
    const { businessId, role } = req.user;

    if (!businessId) {
      return res.status(400).json({ error: 'No business associated with user' });
    }

    if (role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can access growth insights' });
    }

    const cacheKey = `dashboard:insights:${businessId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.json({ source: "cache", ...JSON.parse(cached) });
    }

    const queryTimeout = 10000; // 10 seconds
    const [customers, orders, campaigns, logs] = await Promise.allSettled([
      Customer.find({ businessId }).maxTimeMS(queryTimeout).lean(),
      Order.find({ businessId }).maxTimeMS(queryTimeout).lean(),
      Campaign.find({ businessId }).maxTimeMS(queryTimeout).lean(),
      CommunicationLog.find({ businessId }).maxTimeMS(queryTimeout).lean()
    ]);

    const failedQueries = [customers, orders, campaigns, logs]
      .map((result, i) => ({ result, name: ['customers', 'orders', 'campaigns', 'logs'][i] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failedQueries.length > 0) {
      console.error('Database query failures:', failedQueries.map(q => q.name));
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    const customerData = customers.value || [];
    const orderData = orders.value || [];
    const campaignData = campaigns.value || [];
    const logData = logs.value || [];

    const totalRecords = customerData.length + orderData.length + campaignData.length + logData.length;
    if (totalRecords === 0) {
      return res.json({
        insights: [
          "Start by adding your first customers to build a foundation for growth insights",
          "Create your first marketing campaign to begin tracking engagement",
          "Record customer interactions to identify communication patterns"
        ]
      });
    }

    const insights = await generateGrowthInsights(customerData, orderData, campaignData, logData);

    const response = {
      insights,
      metadata: {
        dataPoints: {
          customers: customerData.length,
          orders: orderData.length,
          campaigns: campaignData.length,
          logs: logData.length
        },
        generatedAt: new Date().toISOString()
      }
    };

    await redisClient.setEx(cacheKey, 900, JSON.stringify(response));

    res.json({ source: "db", ...response });
  } catch (err) {
    console.error("Growth Insights Error:", {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id
    });
    res.status(500).json({
      error: 'Failed to generate insights',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};
