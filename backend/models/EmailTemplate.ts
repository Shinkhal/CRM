import mongoose, { Document, Types, Model } from 'mongoose';

export interface IEmailTemplate {
  name: string;
  subject: string;
  body: string;
  isDefault: boolean;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type EmailTemplateDocument = IEmailTemplate & Document;

const emailTemplateSchema = new mongoose.Schema<IEmailTemplate>(
  {
    name: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

emailTemplateSchema.index({ business: 1, name: 1 }, { unique: true });

export const EmailTemplate: Model<IEmailTemplate> =
  mongoose.models.EmailTemplate || mongoose.model<IEmailTemplate>('EmailTemplate', emailTemplateSchema);
export default EmailTemplate;
