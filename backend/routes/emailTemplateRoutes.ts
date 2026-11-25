import express from 'express';
import {
  getEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '../controllers/emailTemplateController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getEmailTemplates);
router.post('/', protect, authorize(['admin', 'manager']), createEmailTemplate);
router.put('/:id', protect, authorize(['admin', 'manager']), updateEmailTemplate);
router.delete('/:id', protect, authorize(['admin']), deleteEmailTemplate);

export default router;
