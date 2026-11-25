import { startCampaignWorker } from './services/campaignWorker.js';
import express, { Express } from 'express';
import cors from 'cors';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import { connectRedis } from './config/redis.js';
import { configurePassport } from './config/passport.js';
import { corsOptions } from './config/cors.js';
import { createSessionMiddleware } from './config/session.js';
import { env, trustProxyEnabled } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './utils/errorHandler.js';
import morganMiddleware, { requestStartTimer } from './utils/morganMiddleware.js';
import { setupGracefulShutdown } from './utils/shutdown.js';
import { runMigrations } from './utils/migrations.js';
import { startWorkflowScheduler } from './services/workflowScheduler.js';
import {
  blockSqlInjectionPayloads,
  preventHttpParameterPollution,
  sanitizeRequestInput,
  securityHeaders,
} from './middleware/securityMiddleware.js';
import {
  aiRateLimiter,
  authRateLimiter,
  globalRateLimiter,
} from './middleware/rateLimitMiddleware.js';
import customerRoutes from './routes/customerRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import campaignRoutes from './routes/campaignRoutes.js';
import logRoutes from './routes/logRoutes.js';
import authRoutes from './routes/authRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import healthRoutes from './routes/health.js';
import businessRoutes from './routes/businessRoutes.js';
import dealRoutes from './routes/dealRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import noteRoutes from './routes/noteRoutes.js';
import pipelineRoutes from './routes/pipelineRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import emailTemplateRoutes from './routes/emailTemplateRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import unsubscribeRoutes from './routes/unsubscribeRoutes.js';
import workflowRoutes from './routes/workflowRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';

const bootstrap = async () => {
  try {
    logger.info('Initializing backend server', { service: 'bootstrap' });

    // Initialize database connections
    logger.info('Connecting to MongoDB...', { service: 'database' });
    await connectDB();

    logger.info('Connecting to Upstash Redis...', { service: 'upstash-redis' });
    try {
      await connectRedis();
    } catch (error) {
      if (env.NODE_ENV === 'production') {
        throw error;
      }

      logger.warn(
        'Upstash Redis connection failed in non-production mode, continuing with in-memory sessions',
        { 
          error: error instanceof Error ? error.message : String(error),
          service: 'upstash-redis'
        }
      );
    }

    // Idempotent schema level data migrations (legacy indexes, tenant fields).
    // This has to run before any model is written to, otherwise a legacy index
    // can reject a legitimate insert.
    await runMigrations();

    logger.info('Configuring Passport...', { service: 'passport' });
    configurePassport();

    const app: Express = express();

    /**
     * The query parser is pinned to the flat `simple` parser on purpose.
     * Express 5 defaults to it, but the NoSQL-injection sanitiser in
     * `securityMiddleware` relies on flat, string valued query parameters, and
     * a silent default change would remove that guarantee.
     */
    app.set('query parser', 'simple');

    /**
     * Proxy trust is opt in. With it enabled `req.ip` comes from
     * `X-Forwarded-For`, which a client controls unless a reverse proxy
     * overwrites the header. Trusting it by default let anyone bypass the
     * global, auth and AI rate limiters with a forged header.
     */
    app.set('trust proxy', trustProxyEnabled ? 1 : false);
    if (trustProxyEnabled) {
      logger.warn(
        'TRUST_PROXY is enabled: the client IP is taken from X-Forwarded-For. ' +
          'Only enable this when a reverse proxy overwrites that header.',
        { service: 'bootstrap' }
      );
    }

    // Security headers
    app.disable('x-powered-by');
    app.use(securityHeaders);
    app.use(globalRateLimiter);

    // Middleware
    app.use(cors(corsOptions));
    app.use(express.json({ limit: env.BODY_LIMIT }));
    app.use(express.urlencoded({ limit: env.BODY_LIMIT, extended: true }));
    app.use(preventHttpParameterPollution);
    app.use(sanitizeRequestInput);
    app.use(blockSqlInjectionPayloads);
    app.use(cookieParser());
    app.use(requestStartTimer);
    app.use(morganMiddleware(env.NODE_ENV));
    app.use(createSessionMiddleware());
    app.use(passport.initialize());
    app.use(passport.session());

    // Routes
    // The workflow scheduler resumes parked runs and raises the recurring
    // `task.overdue` event.
    startWorkflowScheduler();
    startCampaignWorker();

    logger.info('Setting up routes...', { service: 'routes' });
    app.use('/health', healthRoutes);
    app.use('/api/customers', customerRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/campaigns', campaignRoutes);
    app.use('/api/logs', logRoutes);
    app.use('/api/ai', aiRateLimiter, aiRoutes);
    app.use('/auth', authRateLimiter, authRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api/business', businessRoutes);
    app.use('/api/deals', dealRoutes);
    app.use('/api/tasks', taskRoutes);
    app.use('/api/organizations', organizationRoutes);
    app.use('/api/notes', noteRoutes);
    app.use('/api/pipelines', pipelineRoutes);
    app.use('/api/audit', auditRoutes);
    app.use('/api/email-templates', emailTemplateRoutes);
    app.use('/api/search', searchRoutes);
    app.use('/api/workflows', workflowRoutes);
    app.use('/api/notifications', notificationRoutes);

    // Public: the one-click unsubscribe link inside a campaign email.
    app.use('/api/unsubscribe', unsubscribeRoutes);

    // 404 handler
    app.use((req, res) => {
      res.status(404).json({
        status: 'error',
        message: `Route not found: ${req.originalUrl}`,
        timestamp: new Date().toISOString(),
      });
    });

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Start server
    const server = app.listen(env.PORT, () => {
      logger.info(`Server running on port ${env.PORT}`, {
        environment: env.NODE_ENV,
        serverUrl: env.SERVER_URL,
        service: 'bootstrap',
      });
    });

    // Setup graceful shutdown
    setupGracefulShutdown(server, { timeout: 30000 });

    return app;
  } catch (error) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      service: 'bootstrap',
    });
    process.exit(1);
  }
};

bootstrap().catch((error) => {
  logger.error('Bootstrap failed', {
    error: error instanceof Error ? error.message : String(error),
    service: 'bootstrap',
  });
  process.exit(1);
});
