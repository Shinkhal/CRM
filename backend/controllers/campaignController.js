import { Campaign } from '../models/Campaign.js';
import { Customer } from '../models/Customer.js';
import { CommunicationLog } from '../models/CommunicationLog.js';

const buildQueryCondition = (rule, type = 'number') => {
  const validOps = ['$gt', '$gte', '$lt', '$lte', '$eq'];
  const query = {};
  for (const op of Object.keys(rule)) {
    if (!validOps.includes(op)) {
      throw new Error(`Unsupported operator: ${op}`);
    }
    let val;
    if (type === 'date') {
      val = new Date(rule[op]);
      if (isNaN(val.getTime())) {
        throw new Error(`Invalid date value for operator ${op}`);
      }
    } else {
      val = Number(rule[op]);
      if (isNaN(val)) {
        throw new Error(`Invalid numeric value for operator ${op}`);
      }
    }
    query[op] = val;
  }
  return query;
};

export const createCampaign = async (req, res) => {
  try {
    const { name, segmentRules, message } = req.body;
    const userId = req.user.id;

    if (!name || !segmentRules || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = { userId }; 

    try {
      if (segmentRules.totalSpend) {
        query.totalSpend = buildQueryCondition(segmentRules.totalSpend, 'number');
      }
      if (segmentRules.totalOrders) {
        query.totalOrders = buildQueryCondition(segmentRules.totalOrders, 'number');
      }
      if (segmentRules.lastOrderDate) {
        query.lastOrderDate = buildQueryCondition(segmentRules.lastOrderDate, 'date');
      }
      if (segmentRules.createdAt) {
        query.createdAt = buildQueryCondition(segmentRules.createdAt, 'date');
      }
    } catch (validationErr) {
      return res.status(400).json({ error: validationErr.message });
    }

    const customers = await Customer.find(query);

    const campaign = new Campaign({
      name,
      segmentRules,
      audienceSize: customers.length,
      createdBy: req.user.name,
      userId,
    });

    await campaign.save();

    res.status(201).json({
      message: 'Campaign created successfully',
      campaign,
      customers,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCampaignStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const campaigns = await Campaign.find({ userId }).sort({ createdAt: -1 });
    const campaignIds = campaigns.map(c => c._id);
    const logs = await CommunicationLog.find({
      campaignId: { $in: campaignIds },
      userId,
    });

    const logMap = {};
    for (const log of logs) {
      const id = log.campaignId.toString();
      if (!logMap[id]) logMap[id] = [];
      logMap[id].push(log);
    }

    const stats = campaigns.map(campaign => {
      const logsForCampaign = logMap[campaign._id.toString()] || [];
      const sent = logsForCampaign.filter(log => log.status === 'SENT').length;
      const failed = logsForCampaign.filter(log => log.status === 'FAILED').length;
      const total = logsForCampaign.length;
      const successRate = total > 0 ? Math.round((sent / total) * 100) : 0;

      return {
        ...campaign.toObject(),
        sent,
        failed,
        successRate,
      };
    });

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
