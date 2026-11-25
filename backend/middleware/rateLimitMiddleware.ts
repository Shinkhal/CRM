import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const standardRateLimitResponse = {
  status: 'error',
  message: 'Too many requests. Please try again later.',
};

const createLimiter = (max: number, windowMs = env.RATE_LIMIT_WINDOW_MS) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: standardRateLimitResponse,
    skip: () => env.NODE_ENV === 'test',
  });

export const globalRateLimiter = createLimiter(env.RATE_LIMIT_GLOBAL_MAX);
export const authRateLimiter = createLimiter(env.RATE_LIMIT_AUTH_MAX);
export const aiRateLimiter = createLimiter(env.RATE_LIMIT_AI_MAX);
