import express from 'express';
import {
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
} from '../controllers/workflowController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Static routes come before the parameterised ones.
router.get('/catalogue', protect, authorize(['admin', 'manager', 'viewer']), getWorkflowCatalogue);
router.post('/validate', protect, authorize(['admin', 'manager']), validateWorkflowExpression);
router.get('/runs', protect, authorize(['admin', 'manager', 'viewer']), getWorkflowRuns);
router.post('/sweep/overdue', protect, authorize(['admin', 'manager']), sweepOverdue);
router.get('/runs/:runId', protect, authorize(['admin', 'manager', 'viewer']), getWorkflowRun);

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getWorkflows);
router.post('/', protect, authorize(['admin', 'manager']), createWorkflow);
router.put('/:id', protect, authorize(['admin', 'manager']), updateWorkflow);
router.post('/:id/toggle', protect, authorize(['admin', 'manager']), toggleWorkflow);
router.post('/:id/run', protect, authorize(['admin', 'manager']), runWorkflow);
router.delete('/:id', protect, authorize(['admin']), deleteWorkflow);

export default router;
