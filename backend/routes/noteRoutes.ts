import express from 'express';
import {
  getNotes,
  createNote,
  togglePinNote,
  deleteNote,
  getActivityTimeline,
} from '../controllers/noteController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getNotes);
router.get('/timeline', protect, authorize(['admin', 'manager', 'viewer']), getActivityTimeline);

// Viewers can annotate records even though they cannot own or modify them.
// This mirrors Zoho's team-user model, where a non-sales user can add notes to
// records in org modules. Deleting a note stays restricted to its author or
// an admin, which is enforced inside the controller.
router.post('/', protect, authorize(['admin', 'manager', 'viewer']), createNote);
router.patch('/:id/pin', protect, authorize(['admin', 'manager', 'viewer']), togglePinNote);
router.delete('/:id', protect, authorize(['admin', 'manager', 'viewer']), deleteNote);

export default router;
