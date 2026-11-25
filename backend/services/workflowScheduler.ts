import { WorkflowRun } from '../models/WorkflowRun.js';
import { Task } from '../models/Task.js';
import { resumeWorkflowRun, emitEvent, reapStaleRuns } from './workflowEngine.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * The scheduler resumes workflow runs that were parked on a `wait` action and
 * raises the recurring `task.overdue` event.
 *
 * State lives in MongoDB, so a restart does not lose a pending run: the next
 * tick simply picks it up again.
 */

const RESUME_INTERVAL_MS = Number(env.WORKFLOW_RESUME_INTERVAL_MS) || 30 * 1000;
const OVERDUE_SWEEP_INTERVAL_MS = Number(env.WORKFLOW_OVERDUE_SWEEP_INTERVAL_MS) || 5 * 60 * 1000;

let resumeTimer: NodeJS.Timeout | null = null;
let overdueTimer: NodeJS.Timeout | null = null;
let running = false;

export const resumeDueRuns = async (): Promise<number> => {
  if (running) return 0;
  running = true;

  try {
    const due = await WorkflowRun.find({
      status: 'waiting',
      nextRunAt: { $lte: new Date() },
    }).limit(50);

    let resumed = 0;
    for (const run of due) {
      try {
        /**
         * The claim is atomic. A plain find-then-resume let two instances
         * pick up the same run and execute its remaining steps twice, which
         * means duplicate emails, tasks and deals.
         */
        const claimed = await WorkflowRun.findOneAndUpdate(
          { _id: run._id, status: 'waiting' },
          { $set: { status: 'running', nextRunAt: null } },
          { new: true }
        );
        if (!claimed) continue;

        await resumeWorkflowRun(claimed);
        resumed += 1;
      } catch (error) {
        logger.error('Failed to resume a workflow run', {
          runId: String(run._id),
          error: error instanceof Error ? error.message : 'Unknown error',
          service: 'workflowScheduler',
        });
      }
    }

    return resumed;
  } catch (error) {
    logger.warn('Workflow resume sweep failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'workflowScheduler',
    });
    return 0;
  } finally {
    running = false;
  }
};

/**
 * Raises `task.overdue` for every task that passed its due date and is still
 * open. The sweep keeps a cursor so each task is raised once.
 */
export const sweepOverdueTasks = async (): Promise<number> => {
  try {
    const now = new Date();
    const overdue = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $exists: true, $lt: now },
      overdueNotifiedAt: { $exists: false },
    }).limit(200);

    let raised = 0;
    for (const task of overdue) {
      /**
       * The claim is atomic. A read-modify-write raised `task.overdue` twice
       * when two instances ran the sweep at the same time, which produced
       * duplicate notifications and duplicate tasks.
       */
      const claimed = await Task.updateOne(
        { _id: task._id, overdueNotifiedAt: { $exists: false } },
        { $set: { overdueNotifiedAt: now } }
      );
      if (claimed.modifiedCount !== 1) continue;

      emitEvent({
        event: 'task.overdue',
        businessId: String(task.business),
        entity: 'task',
        entityId: String(task._id),
        doc: { ...task.toObject(), overdueNotifiedAt: now },
        actor: { name: 'Workflow automation' },
      });
      raised += 1;
    }

    return raised;
  } catch (error) {
    logger.warn('Overdue task sweep failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      service: 'workflowScheduler',
    });
    return 0;
  }
};

export const startWorkflowScheduler = (): void => {
  if (resumeTimer) return;

  // A run that was interrupted by a crash would otherwise stay in `running`
  // forever, because the scheduler only resumes `waiting` runs.
  void reapStaleRuns();

  resumeTimer = setInterval(() => {
    void resumeDueRuns();
  }, RESUME_INTERVAL_MS);

  overdueTimer = setInterval(() => {
    void sweepOverdueTasks();
  }, OVERDUE_SWEEP_INTERVAL_MS);

  // Node keeps the process alive for timers, so the intervals are unref'd to
  // let a graceful shutdown finish.
  resumeTimer.unref?.();
  overdueTimer.unref?.();

  logger.info('Workflow scheduler started', {
    resumeIntervalMs: RESUME_INTERVAL_MS,
    overdueIntervalMs: OVERDUE_SWEEP_INTERVAL_MS,
    service: 'workflowScheduler',
  });
};

export const stopWorkflowScheduler = (): void => {
  if (resumeTimer) {
    clearInterval(resumeTimer);
    resumeTimer = null;
  }
  if (overdueTimer) {
    clearInterval(overdueTimer);
    overdueTimer = null;
  }
};

export default { startWorkflowScheduler, stopWorkflowScheduler, resumeDueRuns, sweepOverdueTasks };
