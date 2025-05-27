import express from 'express';
import { createCampaign, getCampaigns, getCampaignStats } from '../controllers/campaignController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/',protect, createCampaign);
router.get('/',protect, getCampaigns);
router.get('/stats',protect, getCampaignStats);


export default router;
