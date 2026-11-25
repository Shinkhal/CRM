import mongoose, { Document, Types, Model } from "mongoose";

export interface ICampaign {
  name: string;
  segmentRules: Record<string, any>;
  audienceSize: number;
  status: 'draft' | 'scheduled' | 'queued' | 'sent' | 'needs_review';
  templateId?: Types.ObjectId;
  subject?: string;
  message?: string;
  createdBy: Types.ObjectId;
  userId: Types.ObjectId;
  business: Types.ObjectId;
  /** @deprecated legacy tenant field, superseded by `business`. */
  businessId?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CampaignDocument = ICampaign & Document;

const campaignSchema = new mongoose.Schema<ICampaign>(
  {
    name: { type: String, required: true },
    segmentRules: { type: mongoose.Schema.Types.Mixed, required: true },
    audienceSize: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'scheduled', 'queued', 'sent', 'needs_review'], default: 'draft' },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'EmailTemplate' },
    subject: { type: String },
    message: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  },
  { timestamps: true, minimize: false }
);

campaignSchema.index({ business: 1, createdAt: -1 });

export const Campaign: Model<ICampaign> =
  mongoose.models.Campaign || mongoose.model<ICampaign>('Campaign', campaignSchema);
export default Campaign;
