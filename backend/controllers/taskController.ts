import { Request, Response } from 'express';
import { Task, TaskPriority, TaskStatus } from '../models/Task.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { emitEvent } from '../services/workflowEngine.js';
import { assertString } from '../utils/validation.js';

const TASK_STATUSES: TaskStatus[] = ['todo', 'in_progress', 'completed'];
const TASK_PRIORITIES: TaskPriority[] = ['low', 'medium', 'high'];

const validateStatus = (value: unknown): TaskStatus => {
  if (value === undefined) return 'todo';
  if (typeof value === 'string' && TASK_STATUSES.includes(value as TaskStatus)) {
    return value as TaskStatus;
  }
  throw new AppError(`Invalid task status: ${value}`, 400);
};

const validatePriority = (value: unknown): TaskPriority => {
  if (value === undefined) return 'medium';
  if (typeof value === 'string' && TASK_PRIORITIES.includes(value as TaskPriority)) {
    return value as TaskPriority;
  }
  throw new AppError(`Invalid task priority: ${value}`, 400);
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const getTasks = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { status, priority, dealId, customerId, assignedTo, overdue, search } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (status && typeof status === 'string') filter.status = status;
  if (priority && typeof priority === 'string') filter.priority = priority;
  // These are what the Deal Detail Drawer and the customer hub rely on to show
  // only the tasks that belong to one record.
  if (dealId && typeof dealId === 'string') filter.relatedDeal = dealId;
  if (customerId && typeof customerId === 'string') filter.relatedCustomer = customerId;
  if (assignedTo && typeof assignedTo === 'string') filter.assignedTo = assignedTo;
  if (overdue === 'true') {
    filter.dueDate = { $lt: new Date() };
    filter.status = { $ne: 'completed' };
  }
  if (search && typeof search === 'string') {
    const safe = escapeRegex(search);
    filter.$or = [
      { title: { $regex: safe, $options: 'i' } },
      { description: { $regex: safe, $options: 'i' } },
    ];
  }

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .populate('relatedCustomer', 'name email phone')
      .populate('relatedDeal', 'title value stage')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: 1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Task.countDocuments(filter),
  ]);

  res.json({ tasks, pagination: buildPaginationMeta(total, pagination) });
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;

  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const {
    title,
    description = '',
    dueDate,
    priority,
    status,
    relatedCustomer,
    relatedDeal,
    assignedTo,
  } = req.body;

  if (!title) {
    throw new AppError('Task title is required', 400);
  }
  assertString(title, 'title', { min: 1, max: 300 });

  const task = new Task({
    title,
    description,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    priority: validatePriority(priority),
    status: validateStatus(status),
    relatedCustomer: relatedCustomer || undefined,
    relatedDeal: relatedDeal || undefined,
    assignedTo: assignedTo || undefined,
    business: businessId,
    createdBy: userId,
  });

  await task.save();
  await task.populate('relatedCustomer', 'name email');
  await task.populate('relatedDeal', 'title');

  await recordAudit(
    auditContextFromRequest(req),
    'task',
    String(task._id),
    'create',
    [
      { field: 'title', to: task.title },
      { field: 'status', to: task.status },
    ],
    task.title
  );

  logger.info('Task created successfully', {
    taskId: task._id,
    businessId,
    service: 'taskController',
  });

  emitEvent({
    event: 'task.created',
    businessId,
    entity: 'task',
    entityId: String(task._id),
    doc: task.toObject(),
    actor: { id: req.user?.id, name: req.user?.name || 'A team member', role: req.user?.role },
  });

  res.status(201).json({ message: 'Task created successfully', task });
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const task = await Task.findOne({ _id: id, business: businessId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const before = task.toObject();

  const { title, description, dueDate, priority, status, relatedCustomer, relatedDeal, assignedTo } = req.body;

  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : undefined;
  if (priority !== undefined) task.priority = validatePriority(priority);
  if (relatedCustomer !== undefined) task.relatedCustomer = relatedCustomer || undefined;
  if (relatedDeal !== undefined) task.relatedDeal = relatedDeal || undefined;
  if (assignedTo !== undefined) task.assignedTo = assignedTo || undefined;

  if (status !== undefined) {
    task.status = validateStatus(status);
    if (task.status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
    } else if (task.status !== 'completed') {
      task.completedAt = undefined;
    }
  }

  await task.save();
  await task.populate('relatedCustomer', 'name email');
  await task.populate('relatedDeal', 'title');

  const changes = diffRecords(before, task.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'task',
    String(task._id),
    'update',
    changes,
    task.title
  );

  if (before.status !== task.status && task.status === 'completed') {
    emitEvent({
      event: 'task.completed',
      businessId,
      entity: 'task',
      entityId: String(task._id),
      doc: task.toObject(),
      previous: { status: before.status },
      actor: { id: req.user?.id, name: req.user?.name || 'A team member', role: req.user?.role },
    });
  }

  logger.info('Task updated successfully', {
    taskId: task._id,
    status: task.status,
    service: 'taskController',
  });

  res.json({ message: 'Task updated successfully', task });
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;

  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const task = await Task.findOne({ _id: id, business: businessId });
  if (!task) {
    throw new AppError('Task not found', 404);
  }

  await task.deleteOne();

  await recordAudit(
    auditContextFromRequest(req),
    'task',
    String(id),
    'delete',
    [{ field: 'title', from: task.title }],
    task.title
  );

  logger.info('Task deleted successfully', {
    taskId: id,
    businessId,
    service: 'taskController',
  });

  res.json({ message: 'Task deleted successfully' });
});

export default { getTasks, createTask, updateTask, deleteTask };
