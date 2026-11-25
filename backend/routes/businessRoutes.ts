import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  inviteMember,
  acceptInvite,
  getTeam,
  updateMemberRole,
  updateMemberStatus,
  removeMember,
  getModules,
  toggleModule,
  getCustomFields,
  addCustomField,
  deleteCustomField,
} from '../controllers/businessController.js';

const router = express.Router();

// SaaS App / Plugin Store routes
router.get('/modules', protect, getModules);
router.post('/modules/toggle', protect, authorize(['admin']), toggleModule);

// Dynamic Custom Fields routes
router.get('/custom-fields', protect, getCustomFields);
router.post('/custom-fields', protect, authorize(['admin']), addCustomField);
router.delete('/custom-fields/:id', protect, authorize(['admin']), deleteCustomField);

// Team invitation & management
router.post('/invite', protect, authorize(['admin']), inviteMember);
router.post('/accept-invite', protect, acceptInvite);
router.get('/team', protect, authorize(['admin', 'manager', 'viewer']), getTeam);
router.put('/team/:userId/role', protect, authorize(['admin']), updateMemberRole);
router.put('/team/:userId/status', protect, authorize(['admin']), updateMemberStatus);
router.delete('/team/:userId', protect, authorize(['admin']), removeMember);

export default router;
