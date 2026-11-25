import mongoose, { Document, Types, Model } from "mongoose";

export type DealStage = 'lead' | 'contacted' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DealPriority = 'low' | 'medium' | 'high';

export interface IStageHistoryItem {
  stage: string;
  changedAt: Date;
  changedBy?: Types.ObjectId;
}

export interface IDeal {
  title: string;
  customerId: Types.ObjectId;
  organizationId?: Types.ObjectId;
  value: number;
  /**
   * Stage keys are data, not a closed enum: stages live on the Pipeline
   * document so tenants can rename, reorder or extend their pipeline. The
   * legacy DealStage union is still exported for the default pipeline.
   */
  stage: string;
  pipelineId?: Types.ObjectId;
  probability: number;
  expectedCloseDate?: Date;
  closedDate?: Date;
  priority: DealPriority;
  notes?: string;
  lostReason?: string;
  lostNotes?: string;
  stageHistory: IStageHistoryItem[];
  customFields?: Map<string, any>;
  assignedTo?: Types.ObjectId;
  business: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type DealDocument = IDeal & Document;

const dealSchema = new mongoose.Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', index: true },
    value: { type: Number, required: true, default: 0 },
    stage: {
      type: String,
      default: 'lead',
      required: true,
      trim: true,
      index: true,
    },
    pipelineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline', index: true },
    probability: { type: Number, default: 20, min: 0, max: 100 },
    expectedCloseDate: { type: Date, index: true },
    closedDate: { type: Date },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    notes: { type: String, default: '' },
    lostReason: { type: String },
    lostNotes: { type: String },
    stageHistory: [
      {
        stage: { type: String, required: true },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    customFields: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

dealSchema.index({ business: 1, stage: 1 });
dealSchema.index({ business: 1, createdAt: -1 });
dealSchema.index({ business: 1, expectedCloseDate: 1 });
dealSchema.index({ business: 1, pipelineId: 1 });

export const Deal: Model<IDeal> = mongoose.models.Deal || mongoose.model<IDeal>('Deal', dealSchema);
export default Deal;
