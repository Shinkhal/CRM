import express from 'express';
import { createOrder, getOrders } from '../controllers/orderController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Only admin and manager can create orders
router.post('/', protect, authorize(['admin', 'manager']), createOrder);

// All roles can view orders
router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getOrders);

export default router;
