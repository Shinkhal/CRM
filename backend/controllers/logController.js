import { sendEmail } from '../services/emailSender.js'; 
import { CommunicationLog } from '../models/CommunicationLog.js';

export const simulateCampaignDelivery = async (req, res) => {
  try {
    const { campaignId, customers, baseMessage } = req.body;

    const logs = [];

    for (const customer of customers) {
      const messageText = `Hi ${customer.name}, ${baseMessage}`;

      const result = await sendEmail(customer.email, 'Campaign Message', messageText);

      const log = new CommunicationLog({
        campaignId,
        customerId: customer._id,
        message: messageText,
        status: result.success ? 'SENT' : 'FAILED',
        vendorResponse: result.success
          ? `Message ID: ${result.messageId}`
          : `Error: ${result.error}`,
      });

      await log.save();
      logs.push(log);
    }

    res.status(200).json({ message: 'Emails processed.', logs });
  } catch (error) {
    console.error('simulateCampaignDelivery error:', error);
    res.status(500).json({ error: error.message });
  }
};


export const updateDeliveryReceipt = async (req, res) => {
  try {
    const { logId, status, vendorResponse } = req.body;

    await CommunicationLog.findByIdAndUpdate(logId, {
      status,
      vendorResponse,
    });

    res.status(200).json({ message: 'Delivery status updated.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getLogsByCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const logs = await CommunicationLog.find({ campaignId }).populate('customerId');
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
