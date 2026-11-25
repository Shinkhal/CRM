import mongoose, { Document, Types, Model } from "mongoose";

/**
 * Lead lifecycle. Mirrors Frappe CRM's `CRM Lead` status pipeline and the
 * Zoho / HubSpot lead stages: a contact is captured as a lead, qualified, and
 * eventually converted into a paying customer.
 */
export type CustomerStatus = 'lead' | 'contacted' | 'qualified' | 'customer' | 'churned';
export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface ICustomer {
  name: string;
  email: string;
  phone?: string;
  position?: string;
  organizationId?: Types.ObjectId;
  status: CustomerStatus;
  source?: string;
  leadScore: number;
  temperature: LeadTemperature;
  leadScoreReasons?: string[];
  convertedAt?: Date;
  assignedTo?: Types.ObjectId;
  totalSpend: number;
  totalOrders: number;
  lastOrderDate?: Date;
  customFields?: Map<string, any>;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type CustomerDocument = ICustomer & Document;

const customerSchema = new mongoose.Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    /**
     * Uniqueness is enforced per tenant by the compound index below. A global
     * unique index on email would stop two different workspaces from sharing a
     * contact, which is a cross-tenant data leak in the other direction.
     */
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    position: { type: String, trim: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    status: {
      type: String,
      enum: ['lead', 'contacted', 'qualified', 'customer', 'churned'],
      default: 'lead',
      index: true,
    },
    source: { type: String, trim: true, default: 'manual', index: true },
    leadScore: { type: Number, default: 0, min: 0, max: 100 },
    temperature: { type: String, enum: ['cold', 'warm', 'hot'], default: 'cold', index: true },
    leadScoreReasons: [{ type: String }],
    convertedAt: { type: Date },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    totalSpend: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    lastOrderDate: { type: Date },
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

customerSchema.index({ business: 1, email: 1 }, { unique: true });
customerSchema.index({ business: 1, createdAt: -1 });
customerSchema.index({ business: 1, status: 1, leadScore: -1 });

export const Customer: Model<ICustomer> =
  mongoose.models.Customer || mongoose.model<ICustomer>('Customer', customerSchema);

export default Customer;
