import mongoose from 'mongoose';
import { redisClient } from '../config/redis.js';
import os from 'node:os';
import { logger } from './logger.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: { status: string; latency?: number; error?: string };
    redis: { status: string; latency?: number; error?: string };
    memory: { used: number; total: number; percentage: number };
  };
  version?: string;
}

export const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const startTime = Date.now();
  const healthCheck: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' },
      memory: { used: 0, total: 0, percentage: 0 },
    },
  };

  // Check MongoDB
  try {
    const dbStartTime = Date.now();
    const dbStatus = await mongoose.connection.db?.admin().ping();
    const dbLatency = Date.now() - dbStartTime;
    
    if (dbStatus) {
      healthCheck.services.database = { 
        status: 'connected', 
        latency: dbLatency 
      };
    } else {
      healthCheck.services.database = { status: 'disconnected' };
      healthCheck.status = 'degraded';
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    healthCheck.services.database = { 
      status: 'error', 
      error: errorMsg 
    };
    healthCheck.status = 'degraded';
    logger.warn('Database health check failed', {
      error: errorMsg,
      service: 'healthCheck',
    });
  }

  // Check Upstash Redis
  try {
    const redisStartTime = Date.now();
    const pingResult = await redisClient.ping();
    const redisLatency = Date.now() - redisStartTime;
    
    healthCheck.services.redis = { 
      status: pingResult === 'PONG' ? 'connected' : 'unhealthy', 
      latency: redisLatency 
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    healthCheck.services.redis = { 
      status: 'error', 
      error: errorMsg 
    };
    healthCheck.status = 'degraded';
    logger.warn('Upstash Redis health check failed', {
      error: errorMsg,
      service: 'healthCheck',
    });
  }

  // Check Memory Usage.
  // RSS is the process footprint that actually competes for host memory.
  // The previous implementation compared `heapUsed` against total host RAM,
  // which made the 85% degradation threshold unreachable.
  const memUsage = process.memoryUsage();
  const totalMemory = os.totalmem();
  const usedMemory = memUsage.rss;
  const memPercentage = (usedMemory / totalMemory) * 100;
  
  healthCheck.services.memory = {
    used: Math.round(usedMemory / 1024 / 1024), // MB
    total: Math.round(totalMemory / 1024 / 1024), // MB
    percentage: Math.round(memPercentage * 100) / 100,
  };

  // If memory usage > 85%, mark as degraded
  if (memPercentage > 85) {
    healthCheck.status = 'degraded';
    logger.warn('High memory usage detected', {
      percentage: memPercentage,
      service: 'healthCheck',
    });
  }

  // If database is down, mark as unhealthy
  if (healthCheck.services.database.status !== 'connected') {
    healthCheck.status = 'unhealthy';
  }

  const duration = Date.now() - startTime;
  logger.debug(`Health check completed in ${duration}ms`, {
    status: healthCheck.status,
    duration,
    service: 'healthCheck',
  });

  return healthCheck;
};

export default performHealthCheck;
