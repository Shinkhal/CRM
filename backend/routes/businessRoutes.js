// routes/businessRoutes.js
import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { inviteMember, acceptInvite, getTeam , updateMemberRole, removeMember } from '../controllers/businessController.js';

const router = express.Router();

// Only admins can invite
router.post('/invite', protect, authorize(['admin']), inviteMember);

// Accept invite (any logged-in user)
router.post('/accept-invite', protect, acceptInvite);

// List all users (admin, manager, viewer)
router.get('/team', protect, authorize(['admin', 'manager', 'viewer']), getTeam);

// Update member role (only admin)
router.put('/team/:userId/role', protect, authorize(['admin']), updateMemberRole);

// Remove member (only admin)
router.delete('/team/:userId', protect, authorize(['admin']), removeMember);


export default router;
