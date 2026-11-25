import { Request, Response } from 'express';
import { Note } from '../models/Note.js';
import { Deal } from '../models/Deal.js';
import { Task } from '../models/Task.js';
import { AuditLog } from '../models/AuditLog.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { buildPaginationMeta, parsePagination } from '../utils/pagination.js';
import { auditContextFromRequest, recordAudit } from '../utils/audit.js';
import { emitEvent } from '../services/workflowEngine.js';

export const getNotes = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { dealId, customerId, organizationId } = req.query;
  const filter: Record<string, any> = { business: businessId };

  if (dealId) filter.relatedDeal = dealId;
  if (customerId) filter.relatedCustomer = customerId;
  if (organizationId) filter.relatedOrganization = organizationId;

  const pagination = parsePagination(req.query as Record<string, unknown>);

  const [notes, total] = await Promise.all([
    Note.find(filter)
      .populate('author', 'name email')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Note.countDocuments(filter),
  ]);

  res.json({ notes, pagination: buildPaginationMeta(total, pagination) });
});

export const createNote = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing business or user context', 401);
  }

  const { content, isPinned = false, relatedDeal, relatedCustomer, relatedOrganization } = req.body;

  if (!content || !content.trim()) {
    throw new AppError('Note content cannot be empty', 400);
  }

  const note = new Note({
    content: content.trim(),
    isPinned: Boolean(isPinned),
    relatedDeal: relatedDeal || undefined,
    relatedCustomer: relatedCustomer || undefined,
    relatedOrganization: relatedOrganization || undefined,
    business: businessId,
    author: userId,
  });

  await note.save();
  await note.populate('author', 'name email');

  await recordAudit(
    auditContextFromRequest(req),
    'note',
    String(note._id),
    'create',
    [{ field: 'content', to: note.content }],
    note.content.slice(0, 80)
  );

  logger.info('Note created', {
    noteId: note._id,
    businessId,
    service: 'noteController',
  });

  emitEvent({
    event: 'note.created',
    businessId,
    entity: 'note',
    entityId: String(note._id),
    doc: note.toObject(),
    actor: { id: req.user?.id, name: req.user?.name || 'A team member', role: req.user?.role },
  });

  res.status(201).json({ message: 'Note added successfully', note });
});

export const togglePinNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const note = await Note.findOne({ _id: id, business: businessId }).populate('author', 'name email');
  if (!note) {
    throw new AppError('Note not found', 404);
  }

  note.isPinned = !note.isPinned;
  await note.save();

  res.json({ message: 'Note pin updated', note });
});

export const deleteNote = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!businessId || !userId) {
    throw new AppError('Unauthorized: missing context', 401);
  }

  const note = await Note.findOne({ _id: id, business: businessId });
  if (!note) {
    throw new AppError('Note not found', 404);
  }

  // Admins can delete any note; others only their own
  if (userRole !== 'admin' && note.author.toString() !== userId) {
    throw new AppError('Forbidden: you can only delete your own notes', 403);
  }

  await note.deleteOne();

  res.json({ message: 'Note deleted successfully' });
});

// Aggregated chronological activity timeline for Deals or Customers
export const getActivityTimeline = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { dealId, customerId } = req.query;

  const timelineItems: Array<{
    type: 'note' | 'stage_change' | 'task' | 'audit';
    timestamp: Date;
    data: any;
  }> = [];

  // Fetch Notes
  const noteFilter: Record<string, any> = { business: businessId };
  if (dealId) noteFilter.relatedDeal = dealId;
  if (customerId) noteFilter.relatedCustomer = customerId;

  const notes = await Note.find(noteFilter).populate('author', 'name email');
  notes.forEach((n) => {
    timelineItems.push({
      type: 'note',
      timestamp: n.createdAt || new Date(),
      data: n,
    });
  });

  // If dealId, fetch Deal stage transition history
  if (dealId) {
    const deal = await Deal.findOne({ _id: dealId, business: businessId })
      .populate('stageHistory.changedBy', 'name email');

    if (deal && deal.stageHistory) {
      deal.stageHistory.forEach((sh) => {
        timelineItems.push({
          type: 'stage_change',
          timestamp: sh.changedAt,
          data: {
            stage: sh.stage,
            changedBy: sh.changedBy,
          },
        });
      });
    }

    // Fetch linked Tasks
    const tasks = await Task.find({ relatedDeal: dealId, business: businessId });
    tasks.forEach((t) => {
      timelineItems.push({
        type: 'task',
        timestamp: t.createdAt || new Date(),
        data: t,
      });
    });
  } else if (customerId) {
    // Tasks linked to customer
    const tasks = await Task.find({ relatedCustomer: customerId, business: businessId });
    tasks.forEach((t) => {
      timelineItems.push({
        type: 'task',
        timestamp: t.createdAt || new Date(),
        data: t,
      });
    });
  }

  /**
   * Field level change history from the audit trail. Stage changes are already
   * rendered from `stageHistory`, so those entries are skipped to avoid
   * showing the same movement twice.
   */
  const auditEntity = dealId ? 'deal' : customerId ? 'customer' : null;
  if (auditEntity) {
    const auditEntries = await AuditLog.find({
      business: businessId,
      entity: auditEntity,
      entityId: dealId || customerId,
    })
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .limit(100);

    for (const entry of auditEntries) {
      const onlyStageChange =
        entry.action === 'update' &&
        entry.changes.length > 0 &&
        entry.changes.every((change) => change.field === 'stage');
      if (onlyStageChange) continue;

      timelineItems.push({
        type: 'audit',
        timestamp: entry.createdAt || new Date(),
        data: entry,
      });
    }
  }

  // Sort descending by timestamp
  timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  res.json(timelineItems);
});

export default {
  getNotes,
  createNote,
  togglePinNote,
  deleteNote,
  getActivityTimeline,
};
