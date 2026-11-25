import { config } from 'dotenv';
import { z } from 'zod';

config();

const rawEnv = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: process.env.PORT ?? '5000',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  SERVER_URL: process.env.SERVER_URL ?? 'http://localhost:5000',
  ALLOWED_ORIGINS:
    process.env.ALLOWED_ORIGINS ?? process.env.CLIENT_URL ?? 'http://localhost:5173',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ?? 'xeno-crm',
  REDIS_TCP_URL: process.env.REDIS_TCP_URL ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  /**
   * The session, refresh and access token secrets are deliberately NOT
   * inter-changeable. They used to fall back to `JWT_SECRET`, which meant a
   * 7 day refresh token verified as a 15 minute access token whenever
   * `REFRESH_TOKEN_SECRET` was unset. Each one is now required on its own.
   */
  SESSION_SECRET: process.env.SESSION_SECRET ?? '',
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'crm.sid',
  SESSION_TTL_HOURS: process.env.SESSION_TTL_HOURS ?? '24',
  /**
   * Proxy trust is off unless it is explicitly enabled. With `trust proxy`
   * set, `req.ip` is derived from `X-Forwarded-For`, which a client controls
   * unless a reverse proxy overwrites the header. Trusting it by default
   * makes every rate limiter bypassable with a forged header.
   */
  TRUST_PROXY: process.env.TRUST_PROXY ?? '0',
  BODY_LIMIT: process.env.BODY_LIMIT ?? '1mb',
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS ?? '900000',
  RATE_LIMIT_GLOBAL_MAX: process.env.RATE_LIMIT_GLOBAL_MAX ?? (process.env.NODE_ENV === 'production' ? '300' : '1500'),
  RATE_LIMIT_AUTH_MAX: process.env.RATE_LIMIT_AUTH_MAX ?? (process.env.NODE_ENV === 'production' ? '20' : '200'),
  RATE_LIMIT_AI_MAX: process.env.RATE_LIMIT_AI_MAX ?? (process.env.NODE_ENV === 'production' ? '40' : '300'),
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ?? '',
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY ?? '',
  GEMINI_MODEL: process.env.GEMINI_MODEL ?? '',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? '',
  SMTP_HOST: process.env.SMTP_HOST ?? 'smtp-relay.brevo.com',
  SMTP_PORT: process.env.SMTP_PORT ?? '587',
  SMTP_SECURE: process.env.SMTP_SECURE ?? '',
  SMTP_USER: process.env.SMTP_USER ?? process.env.EMAIL_USER ?? '',
  SMTP_PASS: process.env.SMTP_PASS ?? process.env.EMAIL_PASS ?? '',
  SMTP_FROM:
    process.env.SMTP_FROM ?? process.env.SMTP_USER ?? process.env.EMAIL_USER ?? '',
  WHATSAPP_API_URL: process.env.WHATSAPP_API_URL ?? '',
  WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY ?? '',
  ALLOW_DEMO_LOGIN: process.env.ALLOW_DEMO_LOGIN ?? 'false',
  WORKFLOW_RESUME_INTERVAL_MS: process.env.WORKFLOW_RESUME_INTERVAL_MS ?? '',
  WORKFLOW_OVERDUE_SWEEP_INTERVAL_MS: process.env.WORKFLOW_OVERDUE_SWEEP_INTERVAL_MS ?? '',
};

/** The minimum length for a key that signs a token or a cookie. */
const SECRET_MIN_LENGTH = 32;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url(),
  SERVER_URL: z.string().url(),
  ALLOWED_ORIGINS: z.string().min(1),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().min(1),
  REDIS_URL: z.string().optional().default(''),
  REDIS_TCP_URL: z.string(),
  UPSTASH_REDIS_REST_URL: z.string(),
  UPSTASH_REDIS_REST_TOKEN: z.string(),
  SESSION_SECRET: z.string().min(SECRET_MIN_LENGTH, `SESSION_SECRET must be at least ${SECRET_MIN_LENGTH} characters`),
  SESSION_COOKIE_NAME: z.string().min(1),
  SESSION_TTL_HOURS: z.coerce.number().int().positive(),
  TRUST_PROXY: z.enum(['0', '1', 'true', 'false']).default('0'),
  BODY_LIMIT: z.string().min(1),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive(),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().positive(),
  RATE_LIMIT_AI_MAX: z.coerce.number().int().positive(),
  JWT_SECRET: z.string().min(SECRET_MIN_LENGTH, `JWT_SECRET must be at least ${SECRET_MIN_LENGTH} characters`),
  REFRESH_TOKEN_SECRET: z.string().min(SECRET_MIN_LENGTH, `REFRESH_TOKEN_SECRET must be at least ${SECRET_MIN_LENGTH} characters`),
  GOOGLE_GEMINI_API_KEY: z.string(),
  GEMINI_MODEL: z.string(),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_SECURE: z.string(),
  SMTP_USER: z.string(),
  SMTP_PASS: z.string(),
  SMTP_FROM: z.string(),
  WHATSAPP_API_URL: z.string(),
  WHATSAPP_API_KEY: z.string(),
  ALLOW_DEMO_LOGIN: z.enum(['', '0', '1', 'false', 'true']).transform(value => value === 'true' || value === '1'),
  WORKFLOW_RESUME_INTERVAL_MS: z.string(),
  WORKFLOW_OVERDUE_SWEEP_INTERVAL_MS: z.string(),
});

/**
 * Cross-field rules that a flat object schema cannot express.
 *
 * - The three signing secrets must be different from each other. A shared
 *   secret lets a session id or a refresh token be replayed as an access
 *   token.
 * - In production the public URLs must be absolute https endpoints. A
 *   `localhost` default silently produces dead unsubscribe links and OAuth
 *   redirects for every real recipient.
 */
const refineEnv = (
  value: z.infer<typeof envSchema>,
  ctx: z.RefinementCtx
): void => {
  const secrets: Array<[string, string]> = [
    ['JWT_SECRET', value.JWT_SECRET],
    ['REFRESH_TOKEN_SECRET', value.REFRESH_TOKEN_SECRET],
    ['SESSION_SECRET', value.SESSION_SECRET],
  ];

  for (let i = 0; i < secrets.length; i += 1) {
    for (let j = i + 1; j < secrets.length; j += 1) {
      if (secrets[i][1] === secrets[j][1]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [secrets[j][0]],
          message: `${secrets[j][0]} must differ from ${secrets[i][0]}`,
        });
      }
    }
  }

  if (value.NODE_ENV === 'production') {
    for (const key of ['CLIENT_URL', 'SERVER_URL'] as const) {
      if (!value[key].startsWith('https://')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be an https URL in production`,
        });
      }
    }
  }
};

const envSchemaWithRules = envSchema.superRefine(refineEnv);

const parsedEnv = envSchemaWithRules.safeParse(rawEnv);

const SENSITIVE_KEYS = new Set([
  'JWT_SECRET',
  'REFRESH_TOKEN_SECRET',
  'SESSION_SECRET',
  'MONGODB_URI',
  'REDIS_URL',
  'REDIS_TCP_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'SMTP_PASS',
  'WHATSAPP_API_KEY',
  'GOOGLE_GEMINI_API_KEY',
  'GOOGLE_CLIENT_SECRET',
]);

const safePreview = (key: string, value: unknown): string => {
  if (SENSITIVE_KEYS.has(key)) {
    return '[REDACTED]';
  }

  if (value === undefined || value === null || value === '') {
    return '[EMPTY]';
  }

  const asString = String(value);
  return asString.length > 120 ? `${asString.slice(0, 117)}...` : asString;
};

/**
 * Reports the environment problems and never returns. The explicit `: never`
 * return type is what lets TypeScript know that `env` is not `T | undefined`
 * at every use site.
 */
/**
 * The explicit type annotation on the variable is what lets TypeScript
 * narrow `parsedEnv` after the call. Without it the compiler cannot tell
 * that the function never returns, so `env` is typed `T | undefined` at
 * every use site.
 */
const printEnvDiagnosticsAndThrow: (error: z.ZodError) => never = (error) => {
  const missing = new Set<string>();
  const invalid: Array<{ key: string; reason: string }> = [];

  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'unknown';

    if (issue.code === 'invalid_type' && issue.input === undefined) {
      missing.add(key);
      continue;
    }

    invalid.push({ key, reason: issue.message });
  }

  console.error('Environment configuration validation failed.');

  if (missing.size > 0) {
    console.error('Missing required environment variables:');
    for (const key of Array.from(missing).sort()) {
      console.error(`- ${key}`);
    }
  }

  if (invalid.length > 0) {
    console.error('Invalid environment variables:');
    for (const item of invalid) {
      console.error(`- ${item.key}: ${item.reason}`);
    }
  }

  const checkedKeys = new Set<string>([
    ...Array.from(missing),
    ...invalid.map((item) => item.key),
  ]);

  if (checkedKeys.size > 0) {
    console.error('Current values preview (safely redacted):');
    for (const key of Array.from(checkedKeys).sort()) {
      const value = (rawEnv as Record<string, unknown>)[key];
      console.error(`- ${key}=${safePreview(key, value)}`);
    }
  }

  throw new Error('Invalid environment configuration');
};

if (!parsedEnv.success) {
  printEnvDiagnosticsAndThrow(parsedEnv.error);
}

export const env = parsedEnv.data;
export const trustProxyEnabled = ['1', 'true'].includes(env.TRUST_PROXY);
export const allowedOrigins = env.ALLOWED_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
