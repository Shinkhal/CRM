import type { CorsOptions } from 'cors';
import { allowedOrigins } from './env.js';

/**
 * The CORS policy.
 *
 * A request with no `Origin` header is allowed through: that is a
 * server-to-server call, a native client or a health check, and it carries
 * no ambient credentials, so the browser's origin rules do not apply to it.
 */
export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
};

export default corsOptions;
