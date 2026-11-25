import { Request, Response, NextFunction } from 'express';
import { Error as MongooseError } from 'mongoose';
import { logger } from './logger.js';
import { env } from '../config/env.js';

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class AppError extends Error implements ApiError {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Translates a driver level failure into the status code the client should
 * have received. A malformed ObjectId or a duplicate key is a bad request,
 * not a server fault, and returning 500 for them hides the real cause behind
 * an "Internal Server Error".
 */
const mapDriverError = (error: any): { statusCode: number; message: string } | null => {
  // Mongoose: a value could not be cast to the schema type.
  if (error instanceof MongooseError.CastError) {
    return {
      statusCode: 400,
      message: `Invalid value for "${error.path}"`,
    };
  }

  // Mongoose: the document failed schema validation.
  if (error instanceof MongooseError.ValidationError) {
    const first = Object.values(error.errors || {})[0] as any;
    return {
      statusCode: 400,
      message: first?.message || 'The request did not pass validation',
    };
  }

  // MongoDB: a unique index was violated.
  if (error?.code === 11000 || error?.code === 11001) {
    const fields = Object.keys(error.keyPattern || error.keyValue || {});
    return {
      statusCode: 409,
      message: fields.length
        ? `A record with the same ${fields.join(' and ')} already exists`
        : 'A record with the same unique value already exists',
    };
  }

  return null;
};

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const error = err as ApiError;
  const mapped = mapDriverError(error);

  const statusCode = mapped?.statusCode ?? error.statusCode ?? 500;
  const message = mapped?.message ?? error.message;
  const isOperational = mapped ? true : (error.isOperational ?? false);

  // Log the error
  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.path} - ${statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode,
      message,
      stack: error.stack,
      service: 'errorHandler',
    });
  } else {
    logger.warn(`${req.method} ${req.path} - ${statusCode}: ${message}`, {
      method: req.method,
      path: req.path,
      statusCode,
      service: 'errorHandler',
    });
  }

  // Response payload
  const errorResponse = {
    status: 'error',
    statusCode,
    message,
    timestamp: new Date().toISOString(),
    ...(env.NODE_ENV === 'development' && {
      stack: error.stack,
      isOperational,
    }),
  };

  res.status(statusCode).json(errorResponse);
};

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => unknown) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default errorHandler;
