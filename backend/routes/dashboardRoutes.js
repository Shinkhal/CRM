import express from 'express';
import { getDashboardSummary, getGrowthInsights } from '../controllers/dashboardController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin can access dashboard
router.get('/summary', protect, getDashboardSummary);
router.get('/insights', protect, authorize(['admin']), getGrowthInsights);

export default router;
