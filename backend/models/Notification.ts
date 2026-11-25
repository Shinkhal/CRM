import mongoose, { Document, Types, Model } from 'mongoose';

export type NotificationType = 'workflow' | 'assignment' | 'task' | 'mention' | 'system';

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message?: string;
  /** Frontend route the notification links to. */
  link?: string;
  entity?: string;
  entityId?: Types.ObjectId;
  read: boolean;
  business: Types.ObjectId;
  createdAt?: Date;
}

export type NotificationDocument = INotification & Document;

const notificationSchema = new mongoose.Schema<INotification>(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['workflow', 'assignment', 'task', 'mention', 'system'],
      default: 'system',
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true },
    link: { type: String, trim: true },
    entity: { type: String, trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    read: { type: Boolean, default: false, index: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;
