import express from 'express';
import performHealthCheck from '../utils/healthCheck.js';
import { asyncHandler } from '../utils/errorHandler.js';

const router = express.Router();

// Lightweight health check for load balancers
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

// Detailed health check
router.get('/ready', asyncHandler(async (req, res) => {
  const healthCheck = await performHealthCheck();
  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                     healthCheck.status === 'degraded' ? 503 : 503;
  
  res.status(statusCode).json(healthCheck);
}));

// Alias for compatibility
router.get('/', asyncHandler(async (req, res) => {
  const healthCheck = await performHealthCheck();
  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                     healthCheck.status === 'degraded' ? 503 : 503;
  
  res.status(statusCode).json(healthCheck);
}));

export default router;
