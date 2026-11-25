import { Request, Response } from 'express';
import { Pipeline, IPipelineStage, StageType } from '../models/Pipeline.js';
import { Deal } from '../models/Deal.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';
import { auditContextFromRequest, diffRecords, recordAudit } from '../utils/audit.js';
import { buildDefaultStages, ensureDefaultPipeline, getDefaultPipeline } from '../services/pipelineService.js';

const STAGE_TYPES: StageType[] = ['open', 'won', 'lost'];

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

/**
 * Normalises a user supplied stage list: unique keys, contiguous positions,
 * exactly one won stage and one lost stage, and a probability that matches the
 * stage type (won = 100, lost = 0).
 */
const normalizeStages = (rawStages: unknown): IPipelineStage[] => {
  if (!Array.isArray(rawStages) || rawStages.length === 0) {
    throw new AppError('A pipeline needs at least one stage', 400);
  }

  const seen = new Set<string>();
  const stages: IPipelineStage[] = rawStages.map((raw: any, index: number) => {
    const label = String(raw?.label || '').trim();
    if (!label) {
      throw new AppError(`Stage at position ${index + 1} needs a label`, 400);
    }

    let key = slugify(String(raw?.key || label));
    if (!key) key = `stage_${index + 1}`;
    let suffix = 2;
    while (seen.has(key)) {
      key = `${slugify(label)}_${suffix}`;
      suffix += 1;
    }
    seen.add(key);

    const type: StageType = STAGE_TYPES.includes(raw?.type) ? raw.type : 'open';
    const providedProbability = Number(raw?.probability);
    const probability =
      type === 'won' ? 100 : type === 'lost' ? 0 : Number.isFinite(providedProbability) ? Math.max(0, Math.min(100, providedProbability)) : 0;

    return {
      key,
      label,
      color: String(raw?.color || 'slate').trim() || 'slate',
      position: index,
      probability,
      type,
    };
  });

  const wonCount = stages.filter((s) => s.type === 'won').length;
  const lostCount = stages.filter((s) => s.type === 'lost').length;

  if (wonCount !== 1) {
    throw new AppError('A pipeline must have exactly one "won" stage', 400);
  }
  if (lostCount !== 1) {
    throw new AppError('A pipeline must have exactly one "lost" stage', 400);
  }

  return stages;
};

const serializePipeline = (pipeline: any) => ({
  ...pipeline.toObject(),
  stages: [...pipeline.stages].sort((a: IPipelineStage, b: IPipelineStage) => a.position - b.position),
});

// --------------------
// List every pipeline for the tenant
// --------------------
export const getPipelines = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  await ensureDefaultPipeline(businessId, req.user?.id);

  const pipelines = await Pipeline.find({ business: businessId }).sort({ isDefault: -1, createdAt: 1 });
  res.json({ pipelines: pipelines.map(serializePipeline) });
});

// --------------------
// The tenant default pipeline, including its ordered stages
// --------------------
export const getDefaultPipelineStages = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pipeline = await getDefaultPipeline(businessId, req.user?.id);
  res.json(serializePipeline(pipeline));
});

// --------------------
// Create a pipeline
// --------------------
export const createPipeline = asyncHandler(async (req: Request, res: Response) => {
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const { name, key, description, stages, isDefault = false } = req.body;
  if (!name || !String(name).trim()) {
    throw new AppError('Pipeline name is required', 400);
  }

  const pipelineKey = slugify(String(key || name));
  const existing = await Pipeline.findOne({ business: businessId, key: pipelineKey });
  if (existing) {
    throw new AppError(`A pipeline with key "${pipelineKey}" already exists`, 409);
  }

  const pipeline = new Pipeline({
    name: String(name).trim(),
    key: pipelineKey,
    description: description?.trim(),
    isDefault: Boolean(isDefault),
    stages: stages ? normalizeStages(stages) : buildDefaultStages(),
    business: businessId,
    createdBy: req.user?.id,
  });

  if (pipeline.isDefault) {
    await Pipeline.updateMany({ business: businessId, _id: { $ne: pipeline._id } }, { isDefault: false });
  }

  await pipeline.save();

  await recordAudit(
    auditContextFromRequest(req),
    'pipeline',
    String(pipeline._id),
    'create',
    [{ field: 'name', to: pipeline.name }],
    pipeline.name
  );

  logger.info('Pipeline created', {
    pipelineId: pipeline._id,
    businessId,
    service: 'pipelineController',
  });

  res.status(201).json({ message: 'Pipeline created successfully', pipeline: serializePipeline(pipeline) });
});

// --------------------
// Update a pipeline
// --------------------
export const updatePipeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pipeline = await Pipeline.findOne({ _id: id, business: businessId });
  if (!pipeline) {
    throw new AppError('Pipeline not found', 404);
  }

  const before = pipeline.toObject();
  const { name, description, stages, isDefault } = req.body;

  if (name !== undefined) {
    if (!String(name).trim()) throw new AppError('Pipeline name cannot be empty', 400);
    pipeline.name = String(name).trim();
  }
  if (description !== undefined) pipeline.description = description?.trim();
  if (stages !== undefined) {
    const normalized = normalizeStages(stages);
    const removedKeys = pipeline.stages
      .map((s) => s.key)
      .filter((key) => !normalized.some((s) => s.key === key));
    if (removedKeys.length > 0) {
      const affected = await Deal.countDocuments({ business: businessId, stage: { $in: removedKeys } });
      if (affected > 0) {
        throw new AppError(
          `Cannot remove stage(s) ${removedKeys.join(', ')}: ${affected} deal(s) still reference them. Move those deals first.`,
          409
        );
      }
    }
    pipeline.stages = normalized;
  }
  if (isDefault !== undefined) {
    pipeline.isDefault = Boolean(isDefault);
    if (pipeline.isDefault) {
      await Pipeline.updateMany({ business: businessId, _id: { $ne: pipeline._id } }, { isDefault: false });
    }
  }

  await pipeline.save();

  const changes = diffRecords(before, pipeline.toObject());
  await recordAudit(
    auditContextFromRequest(req),
    'pipeline',
    String(pipeline._id),
    'update',
    changes,
    pipeline.name
  );

  res.json({ message: 'Pipeline updated successfully', pipeline: serializePipeline(pipeline) });
});

// --------------------
// Delete a pipeline
// --------------------
export const deletePipeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pipeline = await Pipeline.findOne({ _id: id, business: businessId });
  if (!pipeline) {
    throw new AppError('Pipeline not found', 404);
  }

  const dealCount = await Deal.countDocuments({ business: businessId, pipelineId: pipeline._id });
  if (dealCount > 0) {
    throw new AppError(`Cannot delete a pipeline that still has ${dealCount} deal(s)`, 409);
  }

  await pipeline.deleteOne();

  await recordAudit(
    auditContextFromRequest(req),
    'pipeline',
    String(pipeline._id),
    'delete',
    [{ field: 'name', from: pipeline.name }],
    pipeline.name
  );

  res.json({ message: 'Pipeline deleted successfully' });
});

// --------------------
// Make a pipeline the tenant default
// --------------------
export const setDefaultPipeline = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const businessId = req.user?.businessId;
  if (!businessId) {
    throw new AppError('Unauthorized: missing business context', 401);
  }

  const pipeline = await Pipeline.findOne({ _id: id, business: businessId });
  if (!pipeline) {
    throw new AppError('Pipeline not found', 404);
  }

  await Pipeline.updateMany({ business: businessId }, { isDefault: false });
  pipeline.isDefault = true;
  await pipeline.save();

  res.json({ message: 'Default pipeline updated', pipeline: serializePipeline(pipeline) });
});

export default {
  getPipelines,
  getDefaultPipelineStages,
  createPipeline,
  updatePipeline,
  deletePipeline,
  setDefaultPipeline,
};
