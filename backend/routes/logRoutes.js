import express from 'express';
import { simulateCampaignDelivery, updateDeliveryReceipt, getLogsByCampaign } from '../controllers/logController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin and manager can simulate campaign deliveries
router.post('/simulate', protect, authorize(['admin', 'manager']), simulateCampaignDelivery);

// Only admin and manager can update delivery receipts
router.post('/receipt', protect, authorize(['admin', 'manager']), updateDeliveryReceipt);

// All roles can view logs
router.get('/:campaignId', protect, authorize(['admin', 'manager', 'viewer']), getLogsByCampaign);

export default router;
