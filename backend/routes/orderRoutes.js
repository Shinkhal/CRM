import express from 'express';
import { createOrder, getOrders } from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/',protect, createOrder);
router.get('/',protect, getOrders);


export default router;
