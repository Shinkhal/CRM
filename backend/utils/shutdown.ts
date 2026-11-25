import { stopCampaignWorker } from '../services/campaignWorker.js';
import { Server } from 'node:http';
import { disconnectRedis } from '../config/redis.js';
import { disconnectDB } from '../config/db.js';
import { stopWorkflowScheduler } from '../services/workflowScheduler.js';
import { drainWorkflowWork } from '../services/workflowEngine.js';
import { logger } from './logger.js';

interface ShutdownOptions {
  timeout?: number;
}

export const setupGracefulShutdown = (server: Server, options: ShutdownOptions = {}) => {
  const shutdownTimeout = options.timeout || 30000; // 30 seconds default
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) {
      logger.warn(`Received ${signal} again, forcing shutdown`, { signal, service: 'shutdown' });
      process.exit(1);
    }

    isShuttingDown = true;
    logger.info(`Received ${signal}, starting graceful shutdown...`, { signal, service: 'shutdown' });

    // Set timeout for forced shutdown
    const timeoutId = setTimeout(() => {
      logger.error('Graceful shutdown timeout exceeded, forcing exit', { timeout: shutdownTimeout, service: 'shutdown' });
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop accepting new requests
      await new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });

      logger.info('HTTP server closed', { service: 'shutdown' });

      // Stop the workflow scheduler before the database goes away, and let
      // the automations that are already running finish. A workflow that was
      // triggered but had not started yet was previously dropped silently.
      stopWorkflowScheduler();
      await stopCampaignWorker();
      await drainWorkflowWork(5000);

      logger.info('Closing database connections...', { service: 'shutdown' });

      // Disconnect MongoDB
      await disconnectDB();

      // Disconnect Redis subscriber if initialized
      await disconnectRedis();

      logger.info('Redis and MongoDB connections terminated', { service: 'shutdown' });

      clearTimeout(timeoutId);
      logger.info('Graceful shutdown completed successfully', { service: 'shutdown' });
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        service: 'shutdown',
      });
      clearTimeout(timeoutId);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      error: error.message,
      stack: error.stack,
      service: 'uncaughtException',
    });
    gracefulShutdown('uncaughtException');
  });

  /**
   * Handle unhandled promise rejections.
   *
   * A rejection used to shut the whole process down, so a single stray
   * rejection from a third party library took every tenant's traffic with
   * it. It is now logged and the process keeps running.
   */
  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled Promise Rejection', {
      error: error.message,
      stack: error.stack,
      service: 'unhandledRejection',
    });
  });

  logger.info('Graceful shutdown handlers registered', { service: 'shutdown' });

  return {
    shutdown: () => gracefulShutdown('manual'),
  };
};

export default setupGracefulShutdown;
