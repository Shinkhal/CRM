import { Request, Response } from 'express';
import { Workflow, WORKFLOW_EVENTS, WorkflowEvent } from '../models/Workflow.js';
import { WorkflowRun } from '../models/WorkflowRun.js';
import { Deal } from '../models/Deal.js';
import { Customer } from '../models/Customer.js';
import { Task } from '../models/Task.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { validateExpression } from '../utils/expression.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { listWorkflowActions, getWorkflowAction, listWritableFields } from '../services/workflowActions.js';
import { runWorkflowNow } from '../services/workflowEngine.js';
import { sweepOverdueTasks } from '../services/workflowScheduler.js';
import { ensureStarterWorkflows } from '../services/workflowTemplates.js';
import { assertString } from '../utils/validation.js';

const ENTITY_LOADERS: Record<string, (id: string, businessId: string) => Promise<any>> = {
  deal: (id, businessId) => Deal.findOne({ _id: id, business: businessId }),
  customer: (id, businessId) => Customer.findOne({ _id: id, business: businessId }),
  task: (id, businessId) => Task.findOne({ _id: id, business: businessId }),
};

/**
 * Validates a workflow definition before it is stored: the event has to be
 * known, every action type has to exist, and every condition has to parse.
 */
const validateDefinition = (definition: any): void => {
  if (!definition?.name || !String(definition.name).trim()) {
    throw new AppError('Workflow name is required', 400);
  }

  const event = definition?.trigger?.event;
  if (!event || !WORKFLOW_EVENTS.includes(event)) {
    throw new AppError(`Unknown trigger event: ${event}`, 400);
  }

  if (definition.conditions && String(definition.conditions).trim()) {
    const result = validateExpression(String(definition.conditions));
    if (!result.valid) {
      throw new AppError(`Invalid condition: ${result.error}`, 400);
    }
  }

  const actions = Array.isArray(definition.actions) ? definition.actions : [];
  if (actions.length === 0) {
    throw new AppError('A workflow needs at least one action', 400);
  }

  for (const action of actions) {
    if (!getWorkflowAction(action?.actionType)) {
      throw new AppError(`Unknown action type: ${action?.actionType}`, 400);
    }
    if (action.condition && String(action.condition).trim()) {
      const result = validateExpression(String(action.condition));
      if (!result.valid) {
        throw new AppError(`Invalid step condition: ${result.error}`, 400);
      }
    }
  }
};

const serialize = (workflow: any) => ({
  ...workflow.toObject(),
  id: String(workflow._id),
});

// --------------------
// List workflows
// --------------------
export const getWorkflows = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  await ensureStarterWorkflows(businessId, req.user?.id);

  const workflows = await Workflow.find({ business: businessId }).sort({ createdAt: -1 });
  res.json({ workflows: workflows.map(serialize) });
});

// --------------------
// The catalogue of available actions and events
// --------------------
export const getWorkflowCatalogue = asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    events: WORKFLOW_EVENTS,
    actions: listWorkflowActions(),
    writableFields: listWritableFields(),
  });
});

// --------------------
// Validate an expression
// --------------------
export const validateWorkflowExpression = asyncHandler(async (req: Request, res: Response) => {
  const { expression } = req.body;
  if (typeof expression !== 'string') {
    throw new AppError('expression is required', 400);
  }
  res.json(validateExpression(expression));
});

// --------------------
// Create a workflow
// --------------------
export const createWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  validateDefinition(req.body);

  const { name, description, enabled = true, trigger, conditions, actions } = req.body;
  const workflowName = assertString(name, 'name', { min: 1, max: 160 });

  const existing = await Workflow.findOne({ business: businessId, name: workflowName });
  if (existing) {
    throw new AppError(`A workflow named "${String(name).trim()}" already exists`, 409);
  }

  const workflow = new Workflow({
    name: workflowName,
    description: assertString(description, 'description', { optional: true, max: 500 }),
    enabled: Boolean(enabled),
    trigger: {
      event: trigger.event as WorkflowEvent,
      filters: Array.isArray(trigger.filters) ? trigger.filters : [],
    },
    conditions: conditions?.trim() || undefined,
    actions: actions.map((action: any, index: number) => ({
      id: action.id || `step_${index + 1}_${Date.now()}`,
      actionType: action.actionType,
      params: action.params || {},
      condition: action.condition?.trim() || undefined,
      continueOnError: Boolean(action.continueOnError),
    })),
    business: businessId,
    createdBy: req.user?.id,
  });

  await workflow.save();

  await recordAudit(
    auditContextFromRequest(req),
    'workflow',
    String(workflow._id),
    'create',
    [{ field: 'name', to: workflow.name }],
    workflow.name
  );

  logger.info('Workflow created', {
    workflowId: String(workflow._id),
    businessId,
    event: workflow.trigger.event,
    service: 'workflowController',
  });

  res.status(201).json({ message: 'Workflow created successfully', workflow: serialize(workflow) });
});

// --------------------
// Update a workflow
// --------------------
export const updateWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const workflow = await Workflow.findOne({ _id: id, business: businessId });
  if (!workflow) {
    throw new AppError('Workflow not found', 404);
  }

  const before = workflow.toObject();
  const { name, description, enabled, trigger, conditions, actions } = req.body;

  if (actions !== undefined || trigger !== undefined || conditions !== undefined || name !== undefined) {
    validateDefinition({
      name: name ?? workflow.name,
      trigger: trigger ?? workflow.trigger,
      conditions: conditions ?? workflow.conditions,
      actions: actions ?? workflow.actions,
    });
  }

  if (name !== undefined) {
    const trimmed = assertString(name, 'name', { min: 1, max: 160 }) as string;
    const clash = await Workflow.findOne({ business: businessId, name: trimmed, _id: { $ne: workflow._id } });
    if (clash) throw new AppError(`A workflow named "${trimmed}" already exists`, 409);
    workflow.name = trimmed;
  }
  if (description !== undefined) {
    workflow.description = assertString(description, 'description', { optional: true, max: 500 });
  }
  if (enabled !== undefined) workflow.enabled = Boolean(enabled);
  if (trigger !== undefined) {
    workflow.trigger = {
      event: trigger.event as WorkflowEvent,
      filters: Array.isArray(trigger.filters) ? trigger.filters : [],
    };
  }
  if (conditions !== undefined) workflow.conditions = conditions?.trim() || undefined;
  if (actions !== undefined) {
    workflow.actions = actions.map((action: any, index: number) => ({
      id: action.id || `step_${index + 1}_${Date.now()}`,
      actionType: action.actionType,
      params: action.params || {},
      condition: action.condition?.trim() || undefined,
      continueOnError: Boolean(action.continueOnError),
    }));
  }

  await workflow.save();

  await recordAudit(
    auditContextFromRequest(req),
    'workflow',
    String(workflow._id),
    'update',
    diffRecords(before, workflow.toObject()),
    workflow.name
  );

  res.json({ message: 'Workflow updated successfully', workflow: serialize(workflow) });
});

// --------------------
// Enable or disable a workflow
// --------------------
export const toggleWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const workflow = await Workflow.findOne({ _id: id, business: businessId });
  if (!workflow) {
    throw new AppError('Workflow not found', 404);
  }

  const { enabled } = req.body;
  workflow.enabled = enabled === undefined ? !workflow.enabled : Boolean(enabled);
  await workflow.save();

  res.json({
    message: workflow.enabled ? 'Workflow enabled' : 'Workflow disabled',
    workflow: serialize(workflow),
  });
});

// --------------------
// Delete a workflow
// --------------------
export const deleteWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const workflow = await Workflow.findOne({ _id: id, business: businessId });
  if (!workflow) {
    throw new AppError('Workflow not found', 404);
  }

  await workflow.deleteOne();

  await recordAudit(
    auditContextFromRequest(req),
    'workflow',
    String(id),
    'delete',
    [{ field: 'name', from: workflow.name }],
    workflow.name
  );

  res.json({ message: 'Workflow deleted successfully' });
});

// --------------------
// Sweep for overdue tasks on demand
// --------------------
export const sweepOverdue = asyncHandler(async (_req: Request, res: Response) => {
  const raised = await sweepOverdueTasks();
  res.json({ message: 'Overdue sweep complete', raised });
});

// --------------------
// List runs
// --------------------
export const getWorkflowRuns = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { workflowId, status, entity, event } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (workflowId && typeof workflowId === 'string') filter.workflowId = workflowId;
  if (status && typeof status === 'string') filter.status = status;
  if (entity && typeof entity === 'string') filter.entity = entity;
  if (event && typeof event === 'string') filter.event = event;

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [runs, total] = await Promise.all([
    WorkflowRun.find(filter)
      .populate('triggeredBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    WorkflowRun.countDocuments(filter),
  ]);

  res.json({ runs, pagination: buildPaginationMeta(total, pagination) });
});

// --------------------
// One run
// --------------------
export const getWorkflowRun = asyncHandler(async (req: Request, res: Response) => {
  const { runId } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const run = await WorkflowRun.findOne({ _id: runId, business: businessId })
    .populate('triggeredBy', 'name email');

  if (!run) {
    throw new AppError('Workflow run not found', 404);
  }

  res.json({ run });
});

// --------------------
// Run a workflow immediately against a record
// --------------------
export const runWorkflow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { entity, entityId } = req.body;
  if (!entity || !entityId) {
    throw new AppError('entity and entityId are required', 400);
  }

  const loader = ENTITY_LOADERS[entity];
  if (!loader) {
    throw new AppError(`Unknown entity: ${entity}. Expected one of ${Object.keys(ENTITY_LOADERS).join(', ')}`, 400);
  }

  const record = await loader(String(entityId), businessId);
  if (!record) {
    throw new AppError('The record was not found for this business', 404);
  }

  const run = await runWorkflowNow(String(id), {
    businessId,
    entity,
    entityId: String(entityId),
    doc: record.toObject(),
    actor: {
      id: req.user?.id,
      name: req.user?.name || 'A team member',
      role: req.user?.role,
    },
  });

  res.json({ message: 'Workflow executed', run });
});

export default {
  getWorkflows,
  getWorkflowCatalogue,
  validateWorkflowExpression,
  createWorkflow,
  updateWorkflow,
  toggleWorkflow,
  deleteWorkflow,
  getWorkflowRuns,
  getWorkflowRun,
  runWorkflow,
  sweepOverdue,
};
