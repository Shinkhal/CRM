import express from 'express';
import { getAuditLogs, getEntityHistory } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getAuditLogs);
router.get('/:entity/:entityId', protect, authorize(['admin', 'manager', 'viewer']), getEntityHistory);

export default router;
