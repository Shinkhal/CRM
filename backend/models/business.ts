import mongoose, { Document, Types, Model } from "mongoose";

export interface IPendingInvite {
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  token: string;
  invitedAt?: Date;
}

export interface ICustomFieldDefinition {
  id: string;
  entity: 'deal' | 'customer' | 'organization';
  label: string;
  key: string;
  type: 'text' | 'number' | 'select' | 'date';
  options?: string[];
  required?: boolean;
}

export interface IBusinessSettings {
  currency?: string;
  pipelineStages?: string[];
  customFields?: ICustomFieldDefinition[];
}

export const DEFAULT_MODULES = [
  'sales_pipeline',
  'organizations',
  'campaigns',
  'orders',
  'ai_insights',
  'tasks',
];

export interface IBusiness {
  name: string;
  industry?: string;
  owner: Types.ObjectId;
  users: Types.ObjectId[];
  pendingInvites: IPendingInvite[];
  enabledModules: string[];
  settings?: IBusinessSettings;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BusinessDocument = IBusiness & Document;

const businessSchema = new mongoose.Schema<IBusiness>(
  {
    name: { type: String, required: true },
    industry: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pendingInvites: [
      {
        email: { type: String, required: true },
        role: {
          type: String,
          enum: ["admin", "manager", "viewer"],
          required: true,
        },
        token: { type: String },
        invitedAt: { type: Date, default: Date.now },
      },
    ],
    enabledModules: {
      type: [String],
      default: DEFAULT_MODULES,
    },
    settings: {
      currency: { type: String, default: 'INR' },
      pipelineStages: {
        type: [String],
        default: ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'],
      },
      customFields: [
        {
          id: { type: String, required: true },
          entity: {
            type: String,
            enum: ['deal', 'customer', 'organization'],
            required: true,
          },
          label: { type: String, required: true },
          key: { type: String, required: true },
          type: {
            type: String,
            enum: ['text', 'number', 'select', 'date'],
            default: 'text',
          },
          options: [{ type: String }],
          required: { type: Boolean, default: false },
        },
      ],
    },
  },
  { timestamps: true }
);

export const Business: Model<IBusiness> =
  mongoose.models.Business || mongoose.model<IBusiness>("Business", businessSchema);
export default Business;
