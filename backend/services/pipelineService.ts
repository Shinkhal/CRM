import { Pipeline, IPipelineStage, PipelineDocument } from '../models/Pipeline.js';
import { AppError } from '../utils/errorHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Default pipeline, modelled on the stages seeded by Frappe CRM's
 * `add_default_deal_statuses()` and on the classic HubSpot / Zoho sales
 * pipeline. Probability doubles as the forecast weight for each stage.
 */
export const DEFAULT_PIPELINE_KEY = 'default';

export const DEFAULT_PIPELINE_STAGES: Omit<IPipelineStage, 'position'>[] = [
  { key: 'lead', label: 'Lead', color: 'blue', probability: 10, type: 'open' },
  { key: 'contacted', label: 'Contacted', color: 'purple', probability: 25, type: 'open' },
  { key: 'proposal', label: 'Proposal', color: 'amber', probability: 50, type: 'open' },
  { key: 'negotiation', label: 'Negotiation', color: 'indigo', probability: 70, type: 'open' },
  { key: 'won', label: 'Won', color: 'emerald', probability: 100, type: 'won' },
  { key: 'lost', label: 'Lost', color: 'rose', probability: 0, type: 'lost' },
];

export const buildDefaultStages = (): IPipelineStage[] =>
  DEFAULT_PIPELINE_STAGES.map((stage, index) => ({ ...stage, position: index }));

/**
 * Guarantees the tenant always has a usable pipeline. Existing tenants get the
 * default pipeline created lazily the first time a pipeline-aware endpoint is
 * called, so no migration script is required after deploy.
 */
export const ensureDefaultPipeline = async (
  businessId: string,
  createdBy?: string
): Promise<PipelineDocument> => {
  const existing = await Pipeline.findOne({ business: businessId, key: DEFAULT_PIPELINE_KEY });
  if (existing) return existing;

  const pipeline = await Pipeline.create({
    name: 'Sales Pipeline',
    key: DEFAULT_PIPELINE_KEY,
    description: 'Default end-to-end sales pipeline.',
    isDefault: true,
    stages: buildDefaultStages(),
    business: businessId,
    // The tenant owner is not always known here, and the previous fallback
    // wrote a Business id into a `ref: 'User'` field.
    createdBy,
  });

  logger.info('Default pipeline created', {
    businessId,
    pipelineId: pipeline._id,
    service: 'pipelineService',
  });

  return pipeline;
};

export const getDefaultPipeline = async (
  businessId: string,
  createdBy?: string
): Promise<PipelineDocument> => {
  const fallback = await Pipeline.findOne({ business: businessId, isDefault: true });
  if (fallback) return fallback;
  return ensureDefaultPipeline(businessId, createdBy);
};

export const findStage = (
  pipeline: PipelineDocument,
  stageKey: string
): IPipelineStage | undefined => pipeline.stages.find((stage) => stage.key === stageKey);

export const assertStageExists = (pipeline: PipelineDocument, stageKey: string): IPipelineStage => {
  const stage = findStage(pipeline, stageKey);
  if (!stage) {
    throw new AppError(
      `Unknown stage "${stageKey}" for pipeline "${pipeline.name}". Available stages: ${pipeline.stages
        .map((s) => s.key)
        .join(', ')}`,
      400
    );
  }
  return stage;
};

/**
 * Resolves the pipeline a deal belongs to. A deal that already references a
 * pipeline keeps it; otherwise the tenant default is used.
 */
export const resolvePipeline = async (
  businessId: string,
  pipelineId?: string | null,
  createdBy?: string
): Promise<PipelineDocument> => {
  if (pipelineId) {
    const pipeline = await Pipeline.findOne({ _id: pipelineId, business: businessId });
    if (!pipeline) {
      throw new AppError('Pipeline not found for this business', 404);
    }
    return pipeline;
  }
  return getDefaultPipeline(businessId, createdBy);
};

export const toStageMap = (pipeline: PipelineDocument): Record<string, IPipelineStage> => {
  const map: Record<string, IPipelineStage> = {};
  for (const stage of pipeline.stages) map[stage.key] = stage;
  return map;
};
