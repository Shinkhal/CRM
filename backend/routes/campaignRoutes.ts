import express from 'express';
import {
  previewCampaign,
  createCampaign,
  getCampaigns,
  getCampaignStats,
  updateCampaign,
  deleteCampaign,
} from '../controllers/campaignController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/stats', protect, authorize(['admin', 'manager', 'viewer']), getCampaignStats);
router.post('/preview', protect, authorize(['admin', 'manager']), previewCampaign);
router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getCampaigns);
router.post('/', protect, authorize(['admin', 'manager']), createCampaign);
router.put('/:id', protect, authorize(['admin', 'manager']), updateCampaign);
router.delete('/:id', protect, authorize(['admin']), deleteCampaign);

export default router;
