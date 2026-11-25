import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import { parse as parseQuery } from 'qs';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

/**
 * A SQL-injection blocklist.
 *
 * The previous pattern used nested unbounded quantifiers
 * (`\bselect\b\s+.+\s+\bfrom\b`), which is quadratic: doubling the input
 * quadruples the matching time. A single ~1 MB request body was enough to
 * block the Node event loop for minutes, on an unauthenticated route.
 *
 * Every alternative below is either a fixed literal or a single bounded
 * repetition over a character class, so matching is linear in the input.
 */
const SQLI_PATTERN =
  /\bunion\s+(?:all\s+)?select\b|\bselect\s+[\w\s,()*]{0,200}\bfrom\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b|\bupdate\s+\w+\s+set\b|\bor\s+1\s*=\s*1\b/i;

/**
 * Values longer than this are not scanned. An injection payload that reaches
 * a query is short; anything longer is free text (a note, an email body, a
 * description) and scanning it is exactly what produced the false positives.
 */
const MAX_SCAN_LENGTH = 2048;

const hasDangerousMongoKey = (key: string): boolean => key.startsWith('$') || key.includes('.');

const sanitizeInPlace = (target: unknown): void => {
  if (!target || typeof target !== 'object') return;

  if (Array.isArray(target)) {
    for (let i = 0; i < target.length; i++) {
      if (typeof target[i] === 'object' && target[i] !== null) {
        sanitizeInPlace(target[i]);
      }
    }
    return;
  }

  const record = target as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (hasDangerousMongoKey(key)) {
      delete record[key];
    } else if (typeof record[key] === 'object' && record[key] !== null) {
      sanitizeInPlace(record[key]);
    }
  }
};

const hasLikelySqliPayload = (value: unknown): boolean => {
  if (typeof value === 'string') {
    if (value.length > MAX_SCAN_LENGTH) return false;
    return SQLI_PATTERN.test(value);
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasLikelySqliPayload(item));
  }

  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((item) =>
      hasLikelySqliPayload(item)
    );
  }

  return false;
};

export const securityHeaders = helmet({
  xDnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: env.NODE_ENV === 'production',
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
});

export const preventHttpParameterPollution = hpp({
  checkBody: true,
  checkQuery: true,
});

/**
 * Strips Mongo operator keys from the request.
 *
 * Express 5 defines `req.query` as a *getter that re-parses the query string
 * on every access*, so mutating `req.query` in place is a no-op: the next read
 * returns a fresh object with the dangerous keys intact. The query is
 * therefore parsed once here and re-attached as an own property, which makes
 * the sanitiser actually load bearing.
 */
export const sanitizeRequestInput = (req: Request, _res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') {
      sanitizeInPlace(req.body);
    }

    if (req.params && typeof req.params === 'object') {
      sanitizeInPlace(req.params);
    }

    const rawQuery = req.originalUrl.includes('?')
      ? req.originalUrl.slice(req.originalUrl.indexOf('?') + 1)
      : '';

    if (rawQuery) {
      const parsed = parseQuery(rawQuery, { depth: 5, allowDots: false });
      sanitizeInPlace(parsed);
      Object.defineProperty(req, 'query', {
        value: parsed,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  } catch (error) {
    logger.warn('Failed to sanitize request input', {
      error,
      service: 'security',
    });
  }

  next();
};

/**
 * Rejects a request that looks like a SQL injection attempt.
 *
 * The check is applied to the query string and the path parameters only. The
 * body carries free text (notes, task descriptions, campaign messages) and
 * applying a blocklist to it rejected legitimate content: "We compared A -- B"
 * and "Please select the top 5 rows from the table" were both answered with a
 * 400. Body values are validated field by field by the controllers instead.
 */
export const blockSqlInjectionPayloads = (req: Request, res: Response, next: NextFunction) => {
  const flagged = hasLikelySqliPayload(req.query) || hasLikelySqliPayload(req.params);

  if (!flagged) {
    next();
    return;
  }

  logger.warn('Blocked suspicious SQL injection payload', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    service: 'security',
  });

  res.status(400).json({
    status: 'error',
    message: 'Suspicious request payload detected',
  });
};
