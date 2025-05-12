import express from 'express';
import { generateSegmentQuery, suggestMessages, } from '../services/aiService.js';

const router = express.Router();

router.post('/segment', async (req, res) => {
  try {
    const rules = await generateSegmentQuery(req.body.prompt);
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/messages', async (req, res) => {
  try {
    const text = await suggestMessages(req.body.context);
    res.json({ messages: text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
