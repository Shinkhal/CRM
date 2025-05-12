import express from 'express';
import { createCampaign, getCampaigns, getCampaignStats } from '../controllers/campaignController.js';

const router = express.Router();

router.post('/', createCampaign);
router.get('/', getCampaigns);
router.get('/stats', getCampaignStats);


export default router;
