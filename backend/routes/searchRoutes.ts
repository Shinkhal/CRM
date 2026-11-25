import express from 'express';
import { globalSearch } from '../controllers/searchController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), globalSearch);

export default router;
