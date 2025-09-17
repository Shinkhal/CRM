import express from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaignStats,
} from '../controllers/campaignController.js';
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Only admins & managers can create campaigns
router.post('/', protect, authorize(['admin', 'manager']), createCampaign);

// Everyone (admin, manager, viewer) can list campaigns
router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getCampaigns);

// Stats also available to all roles
router.get('/stats', protect, authorize(['admin', 'manager', 'viewer']), getCampaignStats);

export default router;
