import mongoose, { Document, Types, Model } from 'mongoose';

/**
 * Marketing suppression list. A customer on this list is skipped by every
 * campaign send, which is the minimum viable equivalent of Zoho CRM's /
 * HubSpot's unsubscribe handling.
 */
export interface ISuppression {
  email: string;
  reason: 'unsubscribe' | 'bounce' | 'complaint' | 'manual';
  source?: string;
  business: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
}

export type SuppressionDocument = ISuppression & Document;

const suppressionSchema = new mongoose.Schema<ISuppression>(
  {
    email: { type: String, required: true, trim: true, lowercase: true },
    reason: {
      type: String,
      enum: ['unsubscribe', 'bounce', 'complaint', 'manual'],
      default: 'unsubscribe',
      required: true,
    },
    source: { type: String, trim: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

suppressionSchema.index({ business: 1, email: 1 }, { unique: true });

export const Suppression: Model<ISuppression> =
  mongoose.models.Suppression || mongoose.model<ISuppression>('Suppression', suppressionSchema);
export default Suppression;
