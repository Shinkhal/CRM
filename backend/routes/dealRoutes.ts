import express from 'express';
import {
  getDeals,
  getPipelineSummary,
  getForecast,
  createDeal,
  updateDeal,
  deleteDeal,
} from '../controllers/dealController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Specific summary route before parameterized route
router.get('/pipeline-summary', protect, authorize(['admin', 'manager', 'viewer']), getPipelineSummary);
router.get('/forecast', protect, authorize(['admin', 'manager', 'viewer']), getForecast);

// CRUD
router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getDeals);
router.post('/', protect, authorize(['admin', 'manager']), createDeal);
router.put('/:id', protect, authorize(['admin', 'manager']), updateDeal);
router.delete('/:id', protect, authorize(['admin']), deleteDeal);

export default router;
