import { Customer } from '../models/Customer.js';
import { Order } from '../models/Order.js';
import { Campaign } from '../models/Campaign.js';
import { CommunicationLog } from '../models/CommunicationLog.js';
import { generateGrowthInsights } from '../services/aiService.js';

export const getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [customers, orders, campaigns, logs] = await Promise.all([
      Customer.find({ userId }),
      Order.find({ userId }),
      Campaign.find({ userId }),
      CommunicationLog.find({ userId }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.amount, 0);

    // Calculate delivery stats
    const totalMessages = logs.length;
    const messagesSent = logs.filter(l => l.status === 'SENT').length;
    const messagesFailed = logs.filter(l => l.status === 'FAILED').length;

    res.json({
      totalCustomers: customers.length,
      totalOrders: orders.length,
      totalRevenue,
      totalCampaigns: campaigns.length,
      totalMessages,
      messagesSent,
      messagesFailed,
    });
  } catch (error) {
    console.error('Dashboard Summary Error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
};

export const getGrowthInsights = async (req, res) => {
  try {
    // Input validation
    if (!req.user?.id) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const userId = req.user.id;

    // Add timeout and error handling for database queries
    const queryTimeout = 10000; // 10 seconds
    
    const [customers, orders, campaigns, logs] = await Promise.allSettled([
      Customer.find({ userId }).maxTimeMS(queryTimeout).lean(),
      Order.find({ userId }).maxTimeMS(queryTimeout).lean(),
      Campaign.find({ userId }).maxTimeMS(queryTimeout).lean(),
      CommunicationLog.find({ userId }).maxTimeMS(queryTimeout).lean()
    ]);

    // Handle any failed queries
    const failedQueries = [customers, orders, campaigns, logs]
      .map((result, index) => ({ result, name: ['customers', 'orders', 'campaigns', 'logs'][index] }))
      .filter(({ result }) => result.status === 'rejected');

    if (failedQueries.length > 0) {
      console.error('Database query failures:', failedQueries.map(q => q.name));
      return res.status(500).json({ error: 'Failed to fetch data from database' });
    }

    // Extract successful results
    const customerData = customers.status === 'fulfilled' ? customers.value : [];
    const orderData = orders.status === 'fulfilled' ? orders.value : [];
    const campaignData = campaigns.status === 'fulfilled' ? campaigns.value : [];
    const logData = logs.status === 'fulfilled' ? logs.value : [];

    // Check if user has any data
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

    res.json({ 
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
    });

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
