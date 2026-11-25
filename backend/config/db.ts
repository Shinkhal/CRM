import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

let connectPromise: Promise<typeof mongoose> | null = null;
let eventsRegistered = false;

const getErrorMeta = (error: unknown): { errorName: string; errorCode?: string | number } => {
  if (!(error instanceof Error)) {
    return { errorName: 'UnknownError' };
  }

  const maybeCode = (error as Error & { code?: string | number }).code;
  return {
    errorName: error.name || 'Error',
    errorCode: maybeCode,
  };
};

const registerConnectionEvents = () => {
  if (eventsRegistered) {
    return;
  }

  const connection = mongoose.connection;

  connection.on('connected', () => {
    logger.info('MongoDB connected', { service: 'database' });
  });

  connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected', { service: 'database' });
  });

  connection.on('error', (error) => {
    const errorMeta = getErrorMeta(error);
    logger.error('MongoDB connection error', {
      ...errorMeta,
      service: 'database',
    });
  });

  connection.on('reconnected', () => {
    logger.info('MongoDB reconnected', { service: 'database' });
  });

  eventsRegistered = true;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectPromise) {
    return connectPromise;
  }

  const maxAttempts = env.NODE_ENV === 'production' ? 5 : 3;

  registerConnectionEvents();

  connectPromise = (async () => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        logger.info('Attempting MongoDB connection...', {
          attempt,
          maxAttempts,
          service: 'database',
        });

        const connection = await mongoose.connect(env.MONGODB_URI, {
          dbName: env.MONGODB_DB_NAME,
          retryWrites: true,
          w: 'majority',
          appName: 'crm-backend',
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 45000,
          maxPoolSize: 20,
          minPoolSize: env.NODE_ENV === 'production' ? 5 : 1,
        });

        logger.info('MongoDB connection successful', {
          service: 'database',
        });

        return connection;
      } catch (error) {
        lastError = error;
        const errorMeta = getErrorMeta(error);

        logger.error('MongoDB connection attempt failed', {
          attempt,
          maxAttempts,
          ...errorMeta,
          service: 'database',
        });

        if (attempt < maxAttempts) {
          const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
          logger.warn('Retrying MongoDB connection', {
            nextAttemptInMs: backoffMs,
            service: 'database',
          });
          await sleep(backoffMs);
        }
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('MongoDB connection failed after all retries');
  })();

  try {
    return await connectPromise;
  } finally {
    connectPromise = null;
  }
};

export const disconnectDB = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.connection.close();
  logger.info('MongoDB connection closed', { service: 'database' });
};

export default connectDB;
