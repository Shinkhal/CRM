import { Workflow, WorkflowEvent, ITriggerFilter } from '../models/Workflow.js';
import { WorkflowRun, WorkflowRunDocument } from '../models/WorkflowRun.js';
import { Business } from '../models/business.js';
import { User } from '../models/User.js';
import { evaluateCondition } from '../utils/expression.js';
import { getWorkflowAction, WorkflowContext } from './workflowActions.js';
import { logger } from '../utils/logger.js';

/**
 * The workflow engine.
 *
 * Domain code calls `emitEvent` and the engine takes care of matching the
 * tenant's workflows, evaluating their conditions and running their actions.
 * Execution happens off the request path so a slow action never delays the
 * write that triggered it.
 */

/** How deep a chain of triggered workflows may nest before it is cut off. */
const MAX_DEPTH = 3;

/**
 * Guards against a workflow that triggers itself. The key is the workflow,
 * the event and the record, and the window is short enough that a genuine
 * repeat of the same event on the same record still runs.
 */
const REENTRANCY_WINDOW_MS = 5000;
const recentExecutions = new Map<string, number>();

const reentrancyKey = (workflowId: string, event: string, entityId: string): string =>
  `${workflowId}:${event}:${entityId}`;

/**
 * Work that has been scheduled but has not finished yet. The shutdown handler
 * drains it so a SIGTERM does not silently drop an automation that was
 * already triggered.
 */
let inFlight = 0;

export const pendingWorkflowWork = (): number => inFlight;

export const drainWorkflowWork = async (timeoutMs = 5000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (inFlight > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const sweepReentrancy = (): void => {
  const cutoff = Date.now() - REENTRANCY_WINDOW_MS;
  for (const [key, timestamp] of recentExecutions.entries()) {
    if (timestamp < cutoff) recentExecutions.delete(key);
  }
};

/** The map is pruned on every insert so it cannot grow without bound. */
const rememberExecution = (key: string): void => {
  sweepReentrancy();
  if (recentExecutions.size > 10_000) recentExecutions.clear();
  recentExecutions.set(key, Date.now());
};

export interface EmitEventInput {
  event: WorkflowEvent;
  businessId: string;
  entity: string;
  entityId: string;
  doc: Record<string, any>;
  previous?: Record<string, any>;
  actor?: { id?: string; name: string; role?: string };
  /** Nesting depth, used to stop runaway chains. */
  depth?: number;
}

const toPlain = (value: any): Record<string, any> => {
  if (!value) return {};
  if (typeof value.toObject === 'function') return value.toObject();
  if (typeof value === 'object') return { ...value };
  return { value };
};

const compareValues = (actual: any, operator: ITriggerFilter['operator'], expected: any): boolean => {
  switch (operator) {
    case 'equals':
      if (typeof actual === 'number' || typeof expected === 'number') {
        return Number(actual) === Number(expected);
      }
      return String(actual ?? '') === String(expected ?? '');
    case 'not_equals':
      return !compareValues(actual, 'equals', expected);
    case 'contains':
      return String(actual ?? '').toLowerCase().includes(String(expected ?? '').toLowerCase());
    case 'not_contains':
      return !compareValues(actual, 'contains', expected);
    case 'greater_than':
      return Number(actual) > Number(expected);
    case 'less_than':
      return Number(actual) < Number(expected);
    case 'in':
      return Array.isArray(expected)
        ? expected.map((entry) => String(entry)).includes(String(actual))
        : String(expected ?? '')
            .split(',')
            .map((entry) => entry.trim())
            .includes(String(actual));
    case 'not_in':
      return !compareValues(actual, 'in', expected);
    case 'exists':
      return expected === false || expected === 'false'
        ? actual === undefined || actual === null || actual === ''
        : actual !== undefined && actual !== null && actual !== '';
    default:
      return false;
  }
};

const matchesFilters = (doc: Record<string, any>, filters: ITriggerFilter[] = []): boolean => {
  if (!filters || filters.length === 0) return true;

  return filters.every((filter) => {
    if (!filter?.field) return true;
    const actual = filter.field
      .split('.')
      .reduce<any>((value, segment) => (value == null ? undefined : value[segment]), doc);
    return compareValues(actual, filter.operator, filter.value);
  });
};

/**
 * Resolves the user a workflow acts as.
 *
 * A workflow that runs on a timer, or one triggered by a system event, has no
 * human behind it. Rather than leave the created record without an author, the
 * workspace owner acts on the workflow's behalf. The audit trail then shows
 * who is accountable for the change.
 */
const resolveActor = async (
  businessId: string,
  actor?: { id?: string; name: string; role?: string }
): Promise<{ id?: string; name: string; role?: string }> => {
  if (actor?.id) return actor;

  const business = await Business.findById(businessId).select('owner');
  const ownerId = business?.owner ? String(business.owner) : undefined;

  if (ownerId) {
    const owner = await User.findById(ownerId).select('name role');
    return {
      id: ownerId,
      name: actor?.name || owner?.name || 'Workflow automation',
      role: owner?.role,
    };
  }

  return actor || { id: undefined, name: 'Workflow automation' };
};

const buildContext = async (
  input: EmitEventInput,
  businessName: string
): Promise<WorkflowContext> => ({
  event: input.event,
  businessId: input.businessId,
  businessName,
  entity: input.entity,
  entityId: input.entityId,
  doc: toPlain(input.doc),
  previous: input.previous ? toPlain(input.previous) : undefined,
  actor: await resolveActor(input.businessId, input.actor),
  now: new Date().toISOString(),
  depth: input.depth ?? 0,
});

/**
 * Runs the steps of a workflow starting at `run.currentStep`.
 *
 * A `wait` action pauses the run and stores the resume time, so the
 * scheduler can pick it up later even after a restart.
 */
const executeRun = async (
  run: WorkflowRunDocument,
  workflow: any,
  context: WorkflowContext
): Promise<void> => {
  const actions = workflow.actions || [];

  for (let index = run.currentStep; index < actions.length; index += 1) {
    const action = actions[index];
    const definition = getWorkflowAction(action.actionType);

    if (!definition) {
      run.steps.push({
        index,
        actionType: action.actionType,
        status: 'failed',
        error: `Unknown action type "${action.actionType}"`,
        startedAt: new Date(),
        completedAt: new Date(),
      });
      run.status = 'failed';
      run.error = `Unknown action type "${action.actionType}"`;
      run.currentStep = index + 1;
      await run.save();
      return;
    }

    // A step level condition turns the step into a branch.
    if (action.condition && action.condition.trim()) {
      let passes = false;
      try {
        passes = evaluateCondition(action.condition, context as any);
      } catch (error) {
        run.steps.push({
          index,
          actionType: action.actionType,
          status: 'failed',
          error: `Invalid step condition: ${error instanceof Error ? error.message : 'Unknown error'}`,
          startedAt: new Date(),
          completedAt: new Date(),
        });
        run.status = 'failed';
        run.error = 'Invalid step condition';
        run.currentStep = index + 1;
        await run.save();
        return;
      }

      if (!passes) {
        run.steps.push({
          index,
          actionType: action.actionType,
          status: 'skipped',
          skipReason: 'The step condition was not met',
          startedAt: new Date(),
          completedAt: new Date(),
        });
        run.currentStep = index + 1;
        await run.save();
        continue;
      }
    }

    const startedAt = new Date();
    try {
      const result = await definition.run(action.params || {}, context);

      run.steps.push({
        index,
        actionType: action.actionType,
        status: 'completed',
        result,
        startedAt,
        completedAt: new Date(),
      });

      // A wait action parks the run until the scheduler resumes it.
      if (action.actionType === 'wait' && result?.waitUntil) {
        run.status = 'waiting';
        run.nextRunAt = new Date(result.waitUntil);
        run.currentStep = index + 1;
        await run.save();
        return;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      run.steps.push({
        index,
        actionType: action.actionType,
        status: 'failed',
        error: message,
        startedAt,
        completedAt: new Date(),
      });

      if (action.continueOnError) {
        logger.warn('Workflow action failed but the run continues', {
          workflowId: String(workflow._id),
          actionType: action.actionType,
          error: message,
          service: 'workflowEngine',
        });
        run.currentStep = index + 1;
        await run.save();
        continue;
      }

      run.status = 'failed';
      run.error = message;
      run.currentStep = index + 1;
      await run.save();
      return;
    }

    run.currentStep = index + 1;
    await run.save();
  }

  run.status = 'completed';
  run.nextRunAt = undefined;
  await run.save();
};

const processEvent = async (input: EmitEventInput): Promise<void> => {
  const depth = input.depth ?? 0;
  if (depth >= MAX_DEPTH) {
    logger.warn('Workflow chain depth limit reached, event ignored', {
      event: input.event,
      entityId: input.entityId,
      depth,
      service: 'workflowEngine',
    });
    return;
  }

  const workflows = await Workflow.find({
    business: input.businessId,
    enabled: true,
    'trigger.event': input.event,
  });

  if (workflows.length === 0) return;

  const business = await Business.findById(input.businessId).select('name');
  const businessName = business?.name || 'Workspace';
  const context = await buildContext(input, businessName);

  sweepReentrancy();

  for (const workflow of workflows) {
    const key = reentrancyKey(String(workflow._id), input.event, input.entityId);
    if (recentExecutions.has(key)) continue;

    if (!matchesFilters(context.doc, workflow.trigger?.filters)) continue;

    let conditionsPass = true;
    if (workflow.conditions && workflow.conditions.trim()) {
      try {
        conditionsPass = evaluateCondition(workflow.conditions, context as any);
      } catch (error) {
        logger.warn('Workflow condition could not be evaluated', {
          workflowId: String(workflow._id),
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'workflowEngine',
        });
        conditionsPass = false;
      }
    }
    if (!conditionsPass) continue;

    rememberExecution(key);

    const run = await WorkflowRun.create({
      workflowId: workflow._id,
      workflowName: workflow.name,
      event: input.event,
      entity: input.entity,
      entityId: input.entityId,
      status: 'running',
      steps: [],
      context: {
        event: context.event,
        entity: context.entity,
        entityId: context.entityId,
        doc: context.doc,
        previous: context.previous,
        actor: context.actor,
        now: context.now,
      },
      currentStep: 0,
      hops: depth,
      triggeredBy: context.actor.id,
      triggeredByName: context.actor.name,
      business: input.businessId,
    });

    await Workflow.updateOne(
      { _id: workflow._id },
      { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } }
    );

    try {
      await executeRun(run, workflow, context);
    } catch (error) {
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : 'Unknown error';
      await run.save();
      logger.error('Workflow run failed', {
        workflowId: String(workflow._id),
        runId: String(run._id),
        error: run.error,
        service: 'workflowEngine',
      });
    }
  }
};

/**
 * Emits a domain event. Execution is scheduled off the request path so the
 * caller's write is never delayed by a workflow.
 */
export const emitEvent = (input: EmitEventInput): void => {
  if (!input.businessId || !input.entityId || !input.event) return;

  inFlight += 1;
  setImmediate(() => {
    processEvent(input)
      .catch((error) => {
        logger.error('Failed to process a workflow event', {
          event: input.event,
          entityId: input.entityId,
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'workflowEngine',
        });
      })
      .finally(() => {
        inFlight -= 1;
      });
  });
};

/**
 * Runs a workflow immediately against a record, as if the event had fired.
 * This is what the "Run now" button in the workflow editor uses.
 */
export const runWorkflowNow = async (
  workflowId: string,
  options: {
    businessId: string;
    entity: string;
    entityId: string;
    doc: Record<string, any>;
    actor?: { id?: string; name: string; role?: string };
  }
): Promise<WorkflowRunDocument> => {
  const workflow = await Workflow.findOne({ _id: workflowId, business: options.businessId });
  if (!workflow) {
    throw new Error('Workflow not found');
  }

  const business = await Business.findById(options.businessId).select('name');
  const context = await buildContext(
    {
      event: workflow.trigger.event,
      businessId: options.businessId,
      entity: options.entity,
      entityId: options.entityId,
      doc: options.doc,
      actor: options.actor,
    },
    business?.name || 'Workspace'
  );

  const run = await WorkflowRun.create({
    workflowId: workflow._id,
    workflowName: workflow.name,
    event: workflow.trigger.event,
    entity: options.entity,
    entityId: options.entityId,
    status: 'running',
    steps: [],
    context: { ...context, doc: context.doc },
    currentStep: 0,
    triggeredBy: options.actor?.id,
    triggeredByName: options.actor?.name || 'Manual run',
    business: options.businessId,
  });

  await Workflow.updateOne(
    { _id: workflow._id },
    { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } }
  );

  await executeRun(run, workflow, context);
  return run;
};

/**
 * Resumes a run that was waiting on a `wait` action. Used by the scheduler.
 */
export const resumeWorkflowRun = async (run: WorkflowRunDocument): Promise<void> => {
  const workflow = await Workflow.findById(run.workflowId);
  if (!workflow) {
    run.status = 'failed';
    run.error = 'The workflow no longer exists';
    await run.save();
    return;
  }

  if (!workflow.enabled) {
    run.status = 'skipped';
    run.error = 'The workflow was disabled while the run was waiting';
    await run.save();
    return;
  }

  /**
   * A run that has been re-entered too many times is stopped. The counter
   * lives on the run document, so the guard survives a restart.
   */
  const hops = (run.hops || 0) + 1;
  if (hops > MAX_DEPTH) {
    run.status = 'failed';
    run.error = `The workflow chain exceeded the maximum depth of ${MAX_DEPTH}`;
    run.hops = hops;
    await run.save();
    return;
  }
  run.hops = hops;

  const business = await Business.findById(run.business).select('name');
  const context = await buildContext(
    {
      event: run.event as WorkflowEvent,
      businessId: String(run.business),
      entity: run.entity,
      entityId: String(run.entityId),
      doc: run.context?.doc || {},
      previous: run.context?.previous,
      actor: run.context?.actor,
    },
    business?.name || 'Workspace'
  );

  run.status = 'running';
  run.nextRunAt = undefined;
  await run.save();

  await executeRun(run, workflow, context);
};

/**
 * Resolves the recipients of a notification, used by the workflow editor to
 * preview who would be notified.
 */
export const resolveUserByEmail = async (email: string): Promise<string | null> => {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('_id');
  return user ? String(user._id) : null;
};

/**
 * Marks runs that were interrupted by a crash or a restart as failed. A run
 * that is left in `running` is invisible to the scheduler, so without this a
 * crash silently strands an automation.
 */
export const reapStaleRuns = async (olderThanMinutes = 30): Promise<number> => {
  try {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    const result = await WorkflowRun.updateMany(
      { status: 'running', updatedAt: { $lt: cutoff } },
      {
        $set: {
          status: 'failed',
          error: 'The run was interrupted before it finished',
        },
      }
    );
    if (result.modifiedCount > 0) {
      logger.warn('Reaped interrupted workflow runs', {
        count: result.modifiedCount,
        service: 'workflowEngine',
      });
    }
    return result.modifiedCount;
  } catch (error) {
    logger.warn('Could not reap stale workflow runs', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'workflowEngine',
    });
    return 0;
  }
};

export default { emitEvent, runWorkflowNow, resumeWorkflowRun, reapStaleRuns };
