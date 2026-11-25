import express, { Request, Response } from 'express';
import { generateSegmentQuery, suggestMessages } from '../services/aiService.js';
import { asyncHandler, AppError } from '../utils/errorHandler.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// AI endpoints consume a paid quota, so they require an authenticated caller
// with write access rather than being reachable by an anonymous request.
router.post(
  '/segment',
  protect,
  authorize(['admin', 'manager']),
  asyncHandler(async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (!prompt) {
      throw new AppError('prompt is required', 400);
    }
    const rules = await generateSegmentQuery(prompt);
    res.json(rules);
  })
);

router.post(
  '/messages',
  protect,
  authorize(['admin', 'manager']),
  asyncHandler(async (req: Request, res: Response) => {
    const { context } = req.body;
    if (!context) {
      throw new AppError('context is required', 400);
    }
    const text = await suggestMessages(context);
    res.json({ messages: text });
  })
);

export default router;
