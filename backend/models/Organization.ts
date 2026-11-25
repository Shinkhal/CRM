import mongoose, { Document, Types, Model } from "mongoose";

export interface IOrganization {
  name: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  phone?: string;
  email?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  customFields?: Map<string, any>;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type OrganizationDocument = IOrganization & Document;

const organizationSchema = new mongoose.Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, default: 'General' },
    employeeCount: { type: Number, default: 0 },
    annualRevenue: { type: Number, default: 0 },
    phone: { type: String, trim: true },
    email: { type: String, trim: true },
    address: {
      street: { type: String },
      city: { type: String },
      state: { type: String },
      country: { type: String },
      postalCode: { type: String },
    },
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

organizationSchema.index({ business: 1, name: 1 });

export const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', organizationSchema);

export default Organization;
