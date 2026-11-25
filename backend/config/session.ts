import session from 'express-session';
import { redis } from './redis.js';
import { env } from './env.js';
import { logger } from '../utils/logger.js';

/**
 * A session store for the Upstash HTTP client.
 *
 * `connect-redis` v9 writes with the node-redis v4/v5 option shape
 * (`{ expiration: { type: 'EX', value } }`). The Upstash client looks for
 * `expiration.ex`, so it silently matched nothing and **every session was
 * stored without a TTL**: the key never expired, the key space grew without
 * bound, and a stolen session cookie stayed valid forever.
 *
 * A purpose-built store removes the dependency on the client dialect
 * entirely.
 */
export class UpstashSessionStore extends session.Store {
  private readonly prefix: string;

  private readonly ttlSeconds: number;

  constructor(options: { prefix?: string; ttlSeconds: number }) {
    super();
    this.prefix = options.prefix ?? 'CRM:';
    this.ttlSeconds = Math.max(1, Math.floor(options.ttlSeconds));
  }

  private key(sid: string): string {
    return `${this.prefix}${sid}`;
  }

  get(sid: string, callback: (error: unknown, session?: any) => void): void {
    redis
      .get(this.key(sid))
      .then((raw) => {
        if (raw === null || raw === undefined || raw === '') {
          callback(null, undefined);
          return;
        }
        try {
          // The client may hand back an already decoded object or the raw
          // string, depending on the value it was given.
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          callback(null, parsed);
        } catch (error) {
          callback(error);
        }
      })
      .catch((error) => callback(error));
  }

  set(sid: string, value: any, callback: (error?: unknown) => void): void {
    const json = JSON.stringify(value);
    redis
      .set(this.key(sid), json, { ex: this.ttlSeconds })
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  destroy(sid: string, callback: (error?: unknown) => void): void {
    redis
      .del(this.key(sid))
      .then(() => callback(null))
      .catch((error) => callback(error));
  }

  touch(sid: string, _value: any, callback: (error?: unknown) => void): void {
    redis
      .expire(this.key(sid), this.ttlSeconds)
      .then(() => callback(null))
      .catch((error) => callback(error));
  }
}

export const createSessionMiddleware = () => {
  const sameSiteValue: boolean | 'none' | 'lax' | 'strict' =
    env.NODE_ENV === 'production' ? 'none' : 'lax';
  const cookieMaxAgeMs = env.SESSION_TTL_HOURS * 60 * 60 * 1000;
  const ttlSeconds = Math.max(1, Math.floor(env.SESSION_TTL_HOURS * 3600));

  const baseConfig = {
    name: env.SESSION_COOKIE_NAME,
    secret: env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    proxy: env.NODE_ENV === 'production',
    unset: 'destroy' as const,
    cookie: {
      secure: env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: sameSiteValue,
      maxAge: cookieMaxAgeMs,
    },
  };

  const redisConfigured = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

  if (redisConfigured) {
    return session({
      ...baseConfig,
      store: new UpstashSessionStore({ prefix: 'CRM:', ttlSeconds }),
    });
  }

  /**
   * An in-memory store means sessions are not shared between instances and are
   * lost on a restart. That is acceptable in development and not acceptable
   * in production, so it is a boot error there.
   */
  if (env.NODE_ENV === 'production') {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are required in production: ' +
        'the in-memory session store is not shared between instances.'
    );
  }

  logger.warn(
    'Redis is not configured, using the in-memory session store. Sessions will not survive a restart.',
    { service: 'session' }
  );
  return session(baseConfig);
};
