import express from 'express';
import {simulateCampaignDelivery, updateDeliveryReceipt, getLogsByCampaign } from '../controllers/logController.js';

const router = express.Router();

router.post('/simulate', simulateCampaignDelivery);
router.post('/receipt', updateDeliveryReceipt);
router.get('/:campaignId', getLogsByCampaign);

export default router;
