import express from 'express';
import {
  getPipelines,
  getDefaultPipelineStages,
  createPipeline,
  updatePipeline,
  deletePipeline,
  setDefaultPipeline,
} from '../controllers/pipelineController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getPipelines);
router.get('/default', protect, authorize(['admin', 'manager', 'viewer']), getDefaultPipelineStages);
router.post('/', protect, authorize(['admin', 'manager']), createPipeline);
router.put('/:id', protect, authorize(['admin', 'manager']), updatePipeline);
router.post('/:id/default', protect, authorize(['admin']), setDefaultPipeline);
router.delete('/:id', protect, authorize(['admin']), deletePipeline);

export default router;
