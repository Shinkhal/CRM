import mongoose, { Document, Types, Model } from 'mongoose';

/**
 * The events a workflow can subscribe to. The names follow the Frappe CRM
 * convention (`crm.deal_stage_changed`) shortened for this codebase.
 */
export const WORKFLOW_EVENTS = [
  'deal.created',
  'deal.updated',
  'deal.stage_changed',
  'deal.won',
  'deal.lost',
  'customer.created',
  'customer.updated',
  'customer.status_changed',
  'customer.converted',
  'task.created',
  'task.completed',
  'task.overdue',
  'note.created',
  'campaign.sent',
  'manual',
] as const;

export type WorkflowEvent = (typeof WORKFLOW_EVENTS)[number];

export type TriggerOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'in'
  | 'not_in'
  | 'exists';

export interface ITriggerFilter {
  field: string;
  operator: TriggerOperator;
  value?: any;
}

export interface IWorkflowTrigger {
  event: WorkflowEvent;
  filters: ITriggerFilter[];
}

export interface IWorkflowAction {
  /** Stable identifier so the editor can address a step. */
  id: string;
  actionType: string;
  params: Record<string, any>;
  /** Optional expression; when it evaluates false the step is skipped. */
  condition?: string;
  /** When false, a failing step aborts the rest of the run. */
  continueOnError?: boolean;
}

export interface IWorkflow {
  name: string;
  description?: string;
  enabled: boolean;
  trigger: IWorkflowTrigger;
  /** Expression evaluated against the trigger context. */
  conditions?: string;
  actions: IWorkflowAction[];
  runCount: number;
  lastRunAt?: Date;
  business: Types.ObjectId;
  createdBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export type WorkflowDocument = IWorkflow & Document;

const triggerFilterSchema = new mongoose.Schema<ITriggerFilter>(
  {
    field: { type: String, required: true, trim: true },
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'not_contains',
        'greater_than',
        'less_than',
        'in',
        'not_in',
        'exists',
      ],
      required: true,
    },
    value: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const workflowActionSchema = new mongoose.Schema<IWorkflowAction>(
  {
    id: { type: String, required: true },
    actionType: { type: String, required: true },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    condition: { type: String },
    continueOnError: { type: Boolean, default: false },
  },
  { _id: false }
);

const workflowSchema = new mongoose.Schema<IWorkflow>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    enabled: { type: Boolean, default: true, index: true },
    trigger: {
      event: { type: String, enum: WORKFLOW_EVENTS, required: true },
      filters: { type: [triggerFilterSchema], default: [] },
    },
    conditions: { type: String },
    actions: { type: [workflowActionSchema], default: [] },
    runCount: { type: Number, default: 0 },
    lastRunAt: { type: Date },
    business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

workflowSchema.index({ business: 1, enabled: 1, 'trigger.event': 1 });
workflowSchema.index({ business: 1, name: 1 }, { unique: true });

export const Workflow: Model<IWorkflow> =
  mongoose.models.Workflow || mongoose.model<IWorkflow>('Workflow', workflowSchema);
export default Workflow;
