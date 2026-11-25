import express from 'express';
import {
  getOrganizations,
  getOrganizationById,
  createOrganization,
  updateOrganization,
  deleteOrganization,
} from '../controllers/organizationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getOrganizations);
router.get('/:id', protect, authorize(['admin', 'manager', 'viewer']), getOrganizationById);
router.post('/', protect, authorize(['admin', 'manager']), createOrganization);
router.put('/:id', protect, authorize(['admin', 'manager']), updateOrganization);
router.delete('/:id', protect, authorize(['admin']), deleteOrganization);

export default router;
