import mongoose, { Document, Types, Model } from 'mongoose';

export type WorkflowRunStatus = 'running' | 'waiting' | 'completed' | 'failed' | 'skipped';

export interface IWorkflowStepResult {
  index: number;
  actionType: string;
  status: 'completed' | 'failed' | 'skipped';
  result?: any;
  error?: string;
  skipReason?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface IWorkflowRun {
  workflowId: Types.ObjectId;
  workflowName: string;
  event: string;
  entity: string;
  entityId: Types.ObjectId;
  status: WorkflowRunStatus;
  steps: IWorkflowStepResult[];
  /** Snapshot of the trigger context, so a run can be inspected later. */
  context: Record<string, any>;
  currentStep: number;
  /** How many times this run has been re-entered by a triggered workflow. */
  hops: number;
  /** Set when the run is waiting on a `wait` action. */
  nextRunAt?: Date;
  triggeredBy?: Types.ObjectId;
  triggeredByName?: string;
  error?: string;
  business: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WorkflowRunDocument = IWorkflowRun & Document;

const workflowStepSchema = new mongoose.Schema<IWorkflowStepResult>(
  {
    index: { type: Number, required: true },
    actionType: { type: String, required: true },
    status: { type: String, enum: ['completed', 'failed', 'skipped'], required: true },
    result: { type: mongoose.Schema.Types.Mixed },
    error: { type: String },
    skipReason: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { _id: false }
);

const workflowRunSchema = new mongoose.Schema<IWorkflowRun>(
  {
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workflow', required: true, index: true },
    workflowName: { type: String, required: true },
    event: { type: String, required: true, index: true },
    entity: { type: String, required: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    status: {
      type: String,
      enum: ['running', 'waiting', 'completed', 'failed', 'skipped'],
      default: 'running',
      index: true,
    },
    steps: { type: [workflowStepSchema], default: [] },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },
    currentStep: { type: Number, default: 0 },
    hops: { type: Number, default: 0 },
    nextRunAt: { type: Date, index: true },
    triggeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    triggeredByName: { type: String },
    error: { type: String },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
  },
  { timestamps: true }
);

workflowRunSchema.index({ business: 1, createdAt: -1 });
workflowRunSchema.index({ status: 1, nextRunAt: 1 });

export const WorkflowRun: Model<IWorkflowRun> =
  mongoose.models.WorkflowRun || mongoose.model<IWorkflowRun>('WorkflowRun', workflowRunSchema);
export default WorkflowRun;
