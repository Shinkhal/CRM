import express from 'express';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, authorize(['admin', 'manager', 'viewer']), getTasks);
router.post('/', protect, authorize(['admin', 'manager']), createTask);
router.put('/:id', protect, authorize(['admin', 'manager']), updateTask);
router.delete('/:id', protect, authorize(['admin']), deleteTask);

export default router;
