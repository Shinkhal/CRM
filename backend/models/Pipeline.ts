import mongoose, { Document, Types, Model } from 'mongoose';

/**
 * A pipeline is the data-driven equivalent of Frappe CRM's `CRM Deal Status`
 * doctype and Zoho CRM's "multiple sales pipelines": the stages live in the
 * database instead of being hardcoded in the controller and duplicated across
 * the frontend.
 */
export type StageType = 'open' | 'won' | 'lost';

export interface IPipelineStage {
  key: string;
  label: string;
  color: string;
  position: number;
  probability: number;
  type: StageType;
}

export interface IPipeline {
  name: string;
  key: string;
  description?: string;
  isDefault: boolean;
  stages: IPipelineStage[];
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type PipelineDocument = IPipeline & Document;

const stageSchema = new mongoose.Schema<IPipelineStage>(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    color: { type: String, default: 'slate' },
    position: { type: Number, required: true, min: 0 },
    probability: { type: Number, required: true, min: 0, max: 100, default: 0 },
    type: {
      type: String,
      enum: ['open', 'won', 'lost'],
      default: 'open',
      required: true,
    },
  },
  { _id: false }
);

const pipelineSchema = new mongoose.Schema<IPipeline>(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, trim: true },
    isDefault: { type: Boolean, default: false },
    stages: { type: [stageSchema], default: [] },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

pipelineSchema.index({ business: 1, key: 1 }, { unique: true });
pipelineSchema.index({ business: 1, isDefault: 1 });

export const Pipeline: Model<IPipeline> =
  mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', pipelineSchema);
export default Pipeline;
