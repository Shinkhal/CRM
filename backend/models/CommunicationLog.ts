import mongoose, { Document, Types, Model } from "mongoose";

export interface ICommunicationLog {
  campaignId: Types.ObjectId;
  customerId: Types.ObjectId;
  message?: string;
  status: 'SENT' | 'FAILED' | 'PENDING' | 'SKIPPED' | 'UNKNOWN';
  vendorResponse?: string;
  channel: 'email' | 'whatsapp' | 'sms';
  userId: Types.ObjectId;
  business: Types.ObjectId;
  /** @deprecated legacy tenant field, superseded by `business`. */
  businessId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CommunicationLogDocument = ICommunicationLog & Document;

const communicationLogSchema = new mongoose.Schema<ICommunicationLog>(
  {
    campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    message: { type: String },
    status: { type: String, enum: ['SENT', 'FAILED', 'PENDING', 'SKIPPED', 'UNKNOWN'], default: 'SENT' },
    vendorResponse: { type: String },
    channel: { type: String, enum: ['email', 'whatsapp', 'sms'], default: 'email' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  },
  { timestamps: true }
);

communicationLogSchema.index({ business: 1, campaignId: 1, createdAt: -1 });

export const CommunicationLog: Model<ICommunicationLog> =
  mongoose.models.CommunicationLog ||
  mongoose.model<ICommunicationLog>('CommunicationLog', communicationLogSchema);
export default CommunicationLog;
