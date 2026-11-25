import { Task } from '../models/Task.js';
import { Deal } from '../models/Deal.js';
import { Customer } from '../models/Customer.js';
import { Note } from '../models/Note.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { Business } from '../models/business.js';
import { sendEmail } from './emailSender.js';
import { interpolate } from '../utils/expression.js';
import { createNotificationsForUsers } from './notificationService.js';

/**
 * The context every workflow action and condition receives.
 *
 * `doc` is a plain snapshot of the triggering record, so a condition can be
 * written as `doc.value > 10000` without knowing anything about Mongoose.
 */
export interface WorkflowContext {
  event: string;
  businessId: string;
  businessName: string;
  entity: string;
  entityId: string;
  doc: Record<string, any>;
  previous?: Record<string, any>;
  actor: { id?: string; name: string; role?: string };
  now: string;
  /** How many workflow hops led to this context. */
  depth: number;
}

export interface ActionParamDefinition {
  key: string;
  label: string;
  type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'select'
    | 'boolean'
    | 'email'
    | 'duration'
    | 'fields';
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: { label: string; value: string }[];
  default?: any;
}

export interface WorkflowActionDefinition {
  type: string;
  label: string;
  description: string;
  category: string;
  params: ActionParamDefinition[];
  run: (params: Record<string, any>, context: WorkflowContext) => Promise<any>;
}

/**
 * Parses a human duration such as "2 days", "30 minutes" or "1 week" into
 * milliseconds.
 */
/**
 * The longest permitted delay. An unbounded duration produced an Invalid Date
 * when it was added to the current time, and the run then failed to save.
 */
export const MAX_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

export const parseDuration = (input: string): number | null => {
  if (!input) return null;
  const match = String(input)
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(second|seconds|minute|minutes|hour|hours|day|days|week|weeks|month|months)$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
  };

  const key = unit.replace(/s$/, '');
  const milliseconds = amount * (multipliers[key] || 0);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  return Math.min(milliseconds, MAX_DURATION_MS);
};

const resolveUserIds = async (
  recipients: string,
  context: WorkflowContext
): Promise<string[]> => {
  const value = (recipients || '').trim();

  if (!value || value === 'owner' || value === 'assignee') {
    const assignedTo = context.doc?.assignedTo;
    if (assignedTo) {
      const id = typeof assignedTo === 'object' ? String(assignedTo._id) : String(assignedTo);
      return [id];
    }
    // A contact has no assignee, so the owner of the record is the person who
    // created it. Without this fallback every notification workflow on a
    // contact failed with "No recipient could be resolved".
    const createdBy = context.doc?.createdBy;
    if (createdBy) {
      const id = typeof createdBy === 'object' ? String(createdBy._id) : String(createdBy);
      return [id];
    }
    return [];
  }

  if (value === 'team') {
    const business = await Business.findById(context.businessId).select('users');
    return (business?.users || []).map((user) => String(user));
  }

  if (value === 'triggering_user') {
    return context.actor?.id ? [context.actor.id] : [];
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const resolveRecordLink = (entity: string): string => {
  switch (entity) {
    case 'deal':
      return '/pipeline';
    case 'customer':
      return '/customers';
    case 'organization':
      return '/organizations';
    case 'task':
      return '/tasks';
    case 'campaign':
      return '/campaign-history';
    default:
      return '/home';
  }
};

const ACTIONS: WorkflowActionDefinition[] = [
  {
    type: 'create_task',
    label: 'Create a task',
    description: 'Adds a follow-up task linked to the record that triggered the workflow.',
    category: 'Records',
    params: [
      { key: 'title', label: 'Task title', type: 'text', required: true, placeholder: 'Follow up with {{doc.customer.name}}' },
      { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Optional details' },
      {
        key: 'dueIn',
        label: 'Due in',
        type: 'duration',
        placeholder: '2 days',
        help: 'A duration such as "2 days", "30 minutes" or "1 week".',
      },
      {
        key: 'priority',
        label: 'Priority',
        type: 'select',
        options: [
          { label: 'Low', value: 'low' },
          { label: 'Medium', value: 'medium' },
          { label: 'High', value: 'high' },
        ],
        default: 'medium',
      },
      {
        key: 'assignTo',
        label: 'Assign to',
        type: 'select',
        options: [
          { label: 'The record owner', value: 'owner' },
          { label: 'Everyone in the workspace', value: 'team' },
        ],
        default: 'owner',
      },
    ],
    async run(params, context) {
      const title = interpolate(String(params.title || ''), context as any).trim();
      if (!title) throw new Error('The task title is empty after interpolation');

      const duration = params.dueIn ? parseDuration(String(params.dueIn)) : null;
      if (params.dueIn && duration === null) {
        throw new Error(`"${params.dueIn}" is not a valid duration`);
      }

      const assignedTo = await resolveUserIds(String(params.assignTo || 'owner'), context);

      const related: Record<string, any> = {};
      if (context.entity === 'deal') related.relatedDeal = context.entityId;
      if (context.entity === 'customer') related.relatedCustomer = context.entityId;

      const task = new Task({
        title,
        description: interpolate(String(params.description || ''), context as any),
        dueDate: duration ? new Date(Date.now() + duration) : undefined,
        priority: params.priority || 'medium',
        status: 'todo',
        ...related,
        assignedTo: assignedTo[0],
        business: context.businessId,
        createdBy: context.actor.id,
      });

      await task.save();

      return { taskId: String(task._id), title: task.title, dueDate: task.dueDate };
    },
  },
  {
    type: 'update_record',
    label: 'Update the record',
    description: 'Sets one or more fields on the record that triggered the workflow.',
    category: 'Records',
    params: [
      {
        key: 'fields',
        label: 'Fields',
        type: 'fields',
        required: true,
        help: 'Only the fields listed here can be written.',
      },
    ],
    async run(params, context) {
      const fields: { field: string; value: any }[] = Array.isArray(params.fields)
        ? params.fields
        : [];

      if (fields.length === 0) throw new Error('No fields to update');

      const allowed = allowedUpdateFields(context.entity);
      const applied: Record<string, any> = {};

      const record = await loadRecord(context);
      if (!record) throw new Error('The record no longer exists');

      for (const entry of fields) {
        if (!entry?.field) continue;
        if (!allowed.includes(entry.field)) {
          throw new Error(`Field "${entry.field}" cannot be set by a workflow`);
        }
        const value = interpolate(String(entry.value ?? ''), context as any);

        /**
         * A reference to another record is checked against the tenant before
         * it is written. Without this a workflow could point a contact at an
         * organisation belonging to a different workspace.
         */
        if (entry.field === 'organizationId' && value) {
          const organization = await Organization.findOne({
            _id: value,
            business: context.businessId,
          });
          if (!organization) {
            throw new Error('The organisation does not belong to this workspace');
          }
        }
        if (entry.field === 'assignedTo' && value) {
          const user = await User.findOne({
            _id: value,
            business: context.businessId,
          });
          if (!user) {
            throw new Error('The assignee does not belong to this workspace');
          }
        }

        record[entry.field] = castFieldValue(entry.field, value);
        applied[entry.field] = record[entry.field];
      }

      await record.save();
      return { updated: applied };
    },
  },
  {
    type: 'send_email',
    label: 'Send an email',
    description: 'Emails a recipient through the configured SMTP transport.',
    category: 'Communication',
    params: [
      {
        key: 'to',
        label: 'To',
        type: 'email',
        placeholder: 'Leave empty to use the record address',
        help: 'Supports {{doc.email}} style placeholders.',
      },
      { key: 'subject', label: 'Subject', type: 'text', required: true, placeholder: 'A quick follow up' },
      { key: 'body', label: 'Body', type: 'textarea', required: true, placeholder: 'Hi {{doc.name}},' },
    ],
    async run(params, context) {
      const to = interpolate(String(params.to || ''), context as any).trim() || context.doc?.email || '';
      if (!to) throw new Error('No recipient address was resolved');

      const subject = interpolate(String(params.subject || ''), context as any);
      const body = interpolate(String(params.body || ''), context as any);

      const result = await sendEmail(to, subject, body, false);
      if (!result.success) {
        throw new Error(result.error || 'The message could not be sent');
      }

      return { to, subject, messageId: result.messageId };
    },
  },
  {
    type: 'send_notification',
    label: 'Send a notification',
    description: 'Creates an in-app notification for one or more people.',
    category: 'Communication',
    params: [
      {
        key: 'recipients',
        label: 'Recipients',
        type: 'select',
        options: [
          { label: 'The record owner', value: 'owner' },
          { label: 'The person who triggered it', value: 'triggering_user' },
          { label: 'Everyone in the workspace', value: 'team' },
        ],
        default: 'owner',
      },
      { key: 'title', label: 'Title', type: 'text', required: true, placeholder: 'Deal needs attention' },
      { key: 'message', label: 'Message', type: 'textarea', placeholder: 'Optional details' },
    ],
    async run(params, context) {
      const recipients = await resolveUserIds(String(params.recipients || 'owner'), context);
      if (recipients.length === 0) throw new Error('No recipient could be resolved');

      const title = interpolate(String(params.title || ''), context as any);
      const message = interpolate(String(params.message || ''), context as any);

      await createNotificationsForUsers(recipients, {
        businessId: context.businessId,
        type: 'workflow',
        title,
        message,
        link: resolveRecordLink(context.entity),
        entity: context.entity,
        entityId: context.entityId,
      });

      return { recipients, title };
    },
  },
  {
    type: 'assign_record',
    label: 'Assign the record',
    description: 'Assigns the record to a member of the workspace.',
    category: 'Records',
    params: [
      {
        key: 'assignTo',
        label: 'Assign to',
        type: 'text',
        required: true,
        placeholder: 'A user id, or "owner" / "team"',
        help: 'A user id, "owner" to keep the current owner, or "team" to assign to every admin.',
      },
    ],
    async run(params, context) {
      const record = await loadRecord(context);
      if (!record) throw new Error('The record no longer exists');

      const value = String(params.assignTo || '').trim();
      let userIds: string[] = [];

      if (value === 'team') {
        const business = await Business.findById(context.businessId).select('users');
        const users = await User.find({ _id: { $in: business?.users || [] }, role: 'admin' }).select('_id');
        userIds = users.map((user) => String(user._id));
      } else if (value && value !== 'owner') {
        userIds = value.split(',').map((entry) => entry.trim()).filter(Boolean);
      }

      if (userIds.length === 0) {
        throw new Error('No assignee could be resolved');
      }

      record.assignedTo = userIds[0];
      await record.save();

      return { assignedTo: userIds };
    },
  },
  {
    type: 'adjust_lead_score',
    label: 'Adjust the lead score',
    description: 'Adds to the lead score of a contact, clamped to a range.',
    category: 'Scoring',
    params: [
      { key: 'amount', label: 'Amount', type: 'number', required: true, default: 10 },
      { key: 'reason', label: 'Reason', type: 'text', placeholder: 'Opened the follow up email' },
      { key: 'minScore', label: 'Minimum score', type: 'number', default: 0 },
      { key: 'maxScore', label: 'Maximum score', type: 'number', default: 100 },
    ],
    async run(params, context) {
      if (context.entity !== 'customer') {
        throw new Error('The lead score only applies to a contact');
      }

      const customer = await Customer.findOne({ _id: context.entityId, business: context.businessId });
      if (!customer) throw new Error('The contact no longer exists');

      const amount = Number(params.amount);
      if (!Number.isFinite(amount)) throw new Error('The amount must be a number');

      const min = Number(params.minScore ?? 0);
      const max = Number(params.maxScore ?? 100);

      const before = customer.leadScore ?? 0;
      const after = Math.max(min, Math.min(max, before + amount));

      /**
       * The clamped score is written with a single pipeline update so two
       * concurrent adjustments cannot lose one of them.
       */
      await Customer.updateOne(
        { _id: context.entityId, business: context.businessId },
        [
          {
            $set: {
              leadScore: {
                $max: [min, { $min: [max, { $add: [{ $ifNull: ['$leadScore', 0] }, amount] }] }],
              },
            },
          },
        ]
      );

      const temperature = after >= 60 ? 'hot' : after >= 30 ? 'warm' : 'cold';
      await Customer.updateOne(
        { _id: context.entityId, business: context.businessId },
        {
          $set: { temperature },
          ...(params.reason
            ? { $push: { leadScoreReasons: String(params.reason) } }
            : {}),
        }
      );

      return { before, after, delta: after - before, reason: params.reason };
    },
  },
  {
    type: 'set_lead_temperature',
    label: 'Set the lead temperature',
    description: 'Sets the cold, warm or hot band on a contact.',
    category: 'Scoring',
    params: [
      {
        key: 'temperature',
        label: 'Temperature',
        type: 'select',
        required: true,
        options: [
          { label: 'Cold', value: 'cold' },
          { label: 'Warm', value: 'warm' },
          { label: 'Hot', value: 'hot' },
        ],
        default: 'warm',
      },
    ],
    async run(params, context) {
      if (context.entity !== 'customer') {
        throw new Error('The lead temperature only applies to a contact');
      }

      const temperature = String(params.temperature || '').toLowerCase();
      if (!['cold', 'warm', 'hot'].includes(temperature)) {
        throw new Error(`Invalid temperature: ${temperature}`);
      }

      const customer = await Customer.findOne({ _id: context.entityId, business: context.businessId });
      if (!customer) throw new Error('The contact no longer exists');

      customer.temperature = temperature as 'cold' | 'warm' | 'hot';
      await customer.save();

      return { temperature };
    },
  },
  {
    type: 'create_deal',
    label: 'Create a deal',
    description: 'Creates a new deal from the record that triggered the workflow.',
    category: 'Records',
    params: [
      { key: 'title', label: 'Deal title', type: 'text', required: true, placeholder: 'Renewal for {{doc.name}}' },
      { key: 'value', label: 'Value', type: 'number', default: 0 },
      { key: 'stage', label: 'Stage', type: 'text', placeholder: 'lead', help: 'The stage key of the tenant pipeline.' },
      { key: 'expectedCloseDate', label: 'Expected close', type: 'text', placeholder: '2026-12-31' },
    ],
    async run(params, context) {
      if (context.entity !== 'customer') {
        throw new Error('A deal can only be created from a contact');
      }

      const title = interpolate(String(params.title || ''), context as any).trim();
      if (!title) throw new Error('The deal title is empty after interpolation');

      const customer = await Customer.findOne({ _id: context.entityId, business: context.businessId });
      if (!customer) throw new Error('The contact no longer exists');

      const { resolvePipeline } = await import('./pipelineService.js');
      const pipeline = await resolvePipeline(context.businessId, undefined, context.actor.id);
      const stageKey = String(params.stage || '').trim() || pipeline.stages[0]?.key || 'lead';
      const stage = pipeline.stages.find((entry) => entry.key === stageKey);
      if (!stage) {
        throw new Error(`Unknown stage "${stageKey}" for pipeline "${pipeline.name}"`);
      }

      const deal = new Deal({
        title,
        customerId: customer._id,
        organizationId: customer.organizationId,
        value: Number(params.value) || 0,
        stage: stageKey,
        pipelineId: pipeline._id,
        probability: stage.probability,
        expectedCloseDate: params.expectedCloseDate ? new Date(params.expectedCloseDate) : undefined,
        priority: 'medium',
        business: context.businessId,
        createdBy: context.actor.id,
        stageHistory: [{ stage: stageKey, changedAt: new Date(), changedBy: context.actor.id as any }],
      });

      await deal.save();

      return { dealId: String(deal._id), title: deal.title, stage: deal.stage };
    },
  },
  {
    type: 'add_note',
    label: 'Add a note',
    description: 'Adds an internal note to the record that triggered the workflow.',
    category: 'Records',
    params: [
      { key: 'content', label: 'Note', type: 'textarea', required: true, placeholder: 'Automated follow up note' },
    ],
    async run(params, context) {
      const content = interpolate(String(params.content || ''), context as any).trim();
      if (!content) throw new Error('The note is empty after interpolation');

      const related: Record<string, any> = {};
      if (context.entity === 'deal') related.relatedDeal = context.entityId;
      if (context.entity === 'customer') related.relatedCustomer = context.entityId;
      if (context.entity === 'organization') related.relatedOrganization = context.entityId;

      const note = new Note({
        content,
        related,
        business: context.businessId,
        author: context.actor.id,
      });
      await note.save();

      return { noteId: String(note._id) };
    },
  },
  {
    type: 'wait',
    label: 'Wait',
    description: 'Pauses the run for a period before the next action.',
    category: 'Control',
    params: [
      {
        key: 'duration',
        label: 'Duration',
        type: 'duration',
        required: true,
        placeholder: '2 days',
        help: 'A duration such as "2 days", "30 minutes" or "1 week".',
      },
    ],
    async run(params) {
      const duration = parseDuration(String(params.duration || ''));
      if (duration === null) {
        throw new Error(`"${params.duration}" is not a valid duration`);
      }
      return { waitUntil: new Date(Date.now() + duration).toISOString(), durationMs: duration };
    },
  },
];

/**
 * The fields a workflow may write.
 *
 * `stage` is deliberately not here: changing a stage has to go through the
 * pipeline, which validates the stage key and appends to `stageHistory`. A
 * workflow writing it directly would leave the audit trail out of step with
 * the record.
 */
const ALLOWED_UPDATE_FIELDS: Record<string, string[]> = {
  deal: ['notes', 'priority', 'value', 'expectedCloseDate', 'assignedTo'],
  customer: [
    'name',
    'phone',
    'position',
    'status',
    'source',
    'temperature',
    'leadScore',
    'assignedTo',
    'organizationId',
  ],
  task: ['title', 'description', 'priority', 'status', 'dueDate', 'assignedTo'],
  organization: ['name', 'website', 'industry', 'employeeCount', 'annualRevenue', 'phone', 'email'],
};

const allowedUpdateFields = (entity: string): string[] => ALLOWED_UPDATE_FIELDS[entity] || [];

/**
 * The fields a workflow may write, per entity. The editor uses this to offer
 * a picker instead of a free text field.
 */
export const listWritableFields = (): Record<string, string[]> => ({
  deal: ALLOWED_UPDATE_FIELDS.deal,
  customer: ALLOWED_UPDATE_FIELDS.customer,
  task: ALLOWED_UPDATE_FIELDS.task,
  organization: ALLOWED_UPDATE_FIELDS.organization,
});

const castFieldValue = (field: string, value: any): any => {
  if (['value', 'probability', 'leadScore', 'employeeCount', 'annualRevenue'].includes(field)) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
  }
  if (['expectedCloseDate', 'dueDate'].includes(field)) {
    if (!value) return undefined;
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? value : date;
  }
  return value;
};

const loadRecord = async (context: WorkflowContext): Promise<any> => {
  if (context.entity === 'deal') {
    return Deal.findOne({ _id: context.entityId, business: context.businessId });
  }
  if (context.entity === 'customer') {
    return Customer.findOne({ _id: context.entityId, business: context.businessId });
  }
  if (context.entity === 'task') {
    return Task.findOne({ _id: context.entityId, business: context.businessId });
  }
  if (context.entity === 'organization') {
    return Organization.findOne({ _id: context.entityId, business: context.businessId });
  }
  return null;
};

export const WORKFLOW_ACTIONS: Record<string, WorkflowActionDefinition> = Object.fromEntries(
  ACTIONS.map((action) => [action.type, action])
);

export const listWorkflowActions = (): Omit<WorkflowActionDefinition, 'run'>[] =>
  ACTIONS.map((action) => ({
    type: action.type,
    label: action.label,
    description: action.description,
    category: action.category,
    params: action.params,
  }));

export const getWorkflowAction = (type: string): WorkflowActionDefinition | undefined =>
  WORKFLOW_ACTIONS[type];

export default { WORKFLOW_ACTIONS, listWorkflowActions, getWorkflowAction, parseDuration };
