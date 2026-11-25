import express from 'express';
import {
  simulateCampaignDelivery,
  updateDeliveryReceipt,
  getLogsByCampaign,
  getSuppressionList,
  addSuppression,
  removeSuppression,
} from '../controllers/logController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin and manager can simulate campaign deliveries
router.post('/simulate', protect, authorize(['admin', 'manager']), simulateCampaignDelivery);

// Only admin and manager can update delivery receipts
router.post('/receipt', protect, authorize(['admin', 'manager']), updateDeliveryReceipt);

// Marketing suppression list
router.get('/suppression', protect, authorize(['admin', 'manager', 'viewer']), getSuppressionList);
router.post('/suppression', protect, authorize(['admin', 'manager']), addSuppression);
router.delete('/suppression/:id', protect, authorize(['admin', 'manager']), removeSuppression);

// All roles can view logs
router.get('/:campaignId', protect, authorize(['admin', 'manager', 'viewer']), getLogsByCampaign);

export default router;
