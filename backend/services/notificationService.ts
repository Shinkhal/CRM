import { Notification, NotificationType } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export interface CreateNotificationInput {
  userId: string;
  businessId: string;
  type?: NotificationType;
  title: string;
  message?: string;
  link?: string;
  entity?: string;
  entityId?: string;
}

/**
 * Creates an in-app notification. Notifications are best effort: a failure
 * must never abort the workflow that produced them.
 */
export const createNotification = async (input: CreateNotificationInput): Promise<void> => {
  try {
    await Notification.create({
      user: input.userId,
      business: input.businessId,
      type: input.type || 'system',
      title: input.title,
      message: input.message,
      link: input.link,
      entity: input.entity,
      entityId: input.entityId,
      read: false,
    });
  } catch (error) {
    logger.warn('Failed to create a notification', {
      userId: input.userId,
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'notificationService',
    });
  }
};

export const createNotificationsForUsers = async (
  userIds: string[],
  input: Omit<CreateNotificationInput, 'userId'>
): Promise<void> => {
  const unique = [...new Set(userIds.filter(Boolean))];
  await Promise.all(unique.map((userId) => createNotification({ ...input, userId })));
};

export default { createNotification, createNotificationsForUsers };
