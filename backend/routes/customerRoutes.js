import express from 'express';
import { createCustomer, getCustomers } from '../controllers/customerController.js';
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Only admin and manager can create customers
router.post('/', protect, authorize(['admin', 'manager']), createCustomer);

// All roles can view customers
router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getCustomers);

export default router;
