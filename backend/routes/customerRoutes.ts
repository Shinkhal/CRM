import express from 'express';
import {
  createCustomer,
  getCustomers,
  updateCustomer,
  deleteCustomer,
  getLeads,
  convertLead,
  rescoreCustomer,
  getCustomerOverview,
} from '../controllers/customerController.js';
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = express.Router();

// Lead management lives under /api/customers/leads so the lead pipeline can
// be queried and filtered independently from the contact directory.
router.get('/leads', protect, authorize(['admin', 'manager', 'viewer']), getLeads);
router.post('/:id/convert', protect, authorize(['admin', 'manager']), convertLead);
router.post('/:id/rescore', protect, authorize(['admin', 'manager']), rescoreCustomer);
router.get('/:id/overview', protect, authorize(['admin', 'manager', 'viewer']), getCustomerOverview);

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getCustomers);
router.post('/', protect, authorize(['admin', 'manager']), createCustomer);
router.put('/:id', protect, authorize(['admin', 'manager']), updateCustomer);
router.delete('/:id', protect, authorize(['admin']), deleteCustomer);

export default router;
