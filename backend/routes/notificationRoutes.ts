import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getNotifications);
router.get('/unread-count', protect, authorize(['admin', 'manager', 'viewer']), getUnreadCount);
router.post('/read-all', protect, authorize(['admin', 'manager', 'viewer']), markAllAsRead);
router.patch('/:id/read', protect, authorize(['admin', 'manager', 'viewer']), markAsRead);
router.delete('/:id', protect, authorize(['admin', 'manager', 'viewer']), deleteNotification);

export default router;
