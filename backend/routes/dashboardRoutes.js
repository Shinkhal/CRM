import express from 'express';
import { getDashboardSummary, getGrowthInsights } from '../controllers/dashboardController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/summary', protect, getDashboardSummary);
router.get('/insights', protect, getGrowthInsights);

export default router;
