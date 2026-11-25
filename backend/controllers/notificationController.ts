import { Request, Response } from 'express';
import { Notification } from '../models/Notification.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';

/**
 * The in-app notification inbox. Workflows write here, and the user reads
 * them from the bell in the header.
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const { unread } = req.query;
  const filter: Record<string, any> = { business: businessId, user: userId };
  if (unread === 'true') filter.read = false;

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ read: 1, createdAt: -1 }).skip(pagination.skip).limit(pagination.limit),
    Notification.countDocuments(filter),
  ]);

  const unreadCount = await Notification.countDocuments({
    business: businessId,
    user: userId,
    read: false,
  });

  res.json({ notifications, unreadCount, pagination: buildPaginationMeta(total, pagination) });
});

export const getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const unreadCount = await Notification.countDocuments({
    business: businessId,
    user: userId,
    read: false,
  });

  res.json({ unreadCount });
});

export const markAsRead = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const notification = await Notification.findOne({ _id: id, business: businessId, user: userId });
  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  notification.read = true;
  await notification.save();

  res.json({ message: 'Notification marked as read', notification });
});

export const markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const result = await Notification.updateMany(
    { business: businessId, user: userId, read: false },
    { $set: { read: true } }
  );

  res.json({ message: 'All notifications marked as read', updated: result.modifiedCount });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const deleted = await Notification.findOneAndDelete({ _id: id, business: businessId, user: userId });
  if (!deleted) {
    throw new AppError('Notification not found', 404);
  }

  res.json({ message: 'Notification deleted' });
});

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
