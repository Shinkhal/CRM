import morgan, { StreamOptions } from 'morgan';
import { Request } from 'express';
import { logger } from './logger.js';

// Custom Morgan token for response time in milliseconds
morgan.token('response-time-ms', (req: any, _res: any) => {
  if (!req._startTime) return '0';
  const ms = Date.now() - req._startTime;
  return String(ms);
});

// Stream for Morgan to output to Winston
const stream: StreamOptions = {
  write: (message: string) => {
    const logEntry = message.trim();

    /**
     * The status code is the first field of the format below, so it is read
     * by position. The previous implementation took the first run of three
     * digits anywhere in the line, which picked up the remote address
     * (`192.168.1.50` -> `192`) and meant a 5xx response was essentially
     * never written to the error log.
     */
    const statusCode = Number.parseInt(logEntry.slice(0, 3), 10) || 0;

    if (statusCode >= 500) {
      logger.error(logEntry, { metadata: 'http' });
    } else if (statusCode >= 400) {
      logger.warn(logEntry, { metadata: 'http' });
    } else {
      logger.info(logEntry, { metadata: 'http' });
    }
  },
};

// Custom Morgan format for detailed logging
/**
 * The status code comes first so it can be read by position. The URL is
 * logged without its query string, because the query carries credentials:
 * the unsubscribe token and the OAuth state are both query parameters.
 */
const morganFormat =
  ':status :remote-addr - :remote-user [:date[clf]] ":method :safe-url HTTP/:http-version" :res[content-length] ":referrer" ":user-agent" :response-time-ms ms';

// Development format - shorter and colorized
const morganDevFormat = ':status :method :safe-url :response-time-ms ms';

/**
 * Stamps the request arrival time. The `response-time-ms` Morgan token reads
 * it; without this stamp every logged response time was 0.
 */
export const requestStartTimer = (req: Request, _res: unknown, next: () => void) => {
  (req as any)._startTime = Date.now();
  next();
};

/**
 * A request URL without its query string. The unsubscribe token, the OAuth
 * state and any filter expression are query parameters, and the access log
 * is not the place for them.
 */
morgan.token('safe-url', (req: any) => {
  const url: string = req.originalUrl || req.url || '';
  const queryIndex = url.indexOf('?');
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
});

export const morganMiddleware = (env: string) => {
  const format = env === 'production' ? morganFormat : morganDevFormat;

  return morgan(format, {
    stream,
    skip: (req: Request) => {
      // Skip all health check endpoints
      const path = req.originalUrl || (req as any).path || req.url || '';
      return path.startsWith('/health');
    },
  });
};

export default morganMiddleware;
