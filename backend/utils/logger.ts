import winston from 'winston';
import fs from 'node:fs';
import path from 'node:path';
import { env } from '../config/env.js';

/* ══════════════════════════════════════════════════════════════
   ANSI COLOUR PALETTE
   (works natively in any Unix terminal / Windows Terminal / bun)
══════════════════════════════════════════════════════════════ */
const c = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',

  // foreground
  white:   '\x1b[97m',
  grey:    '\x1b[90m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  blue:    '\x1b[34m',

  // background
  bgRed:   '\x1b[41m',
  bgBlue:  '\x1b[44m',
} as const;

/* ══════════════════════════════════════════════════════════════
   LEVEL DEFINITIONS  (icon · colour · label)
══════════════════════════════════════════════════════════════ */
const LEVELS: Record<string, { icon: string; color: string; label: string }> = {
  error: { icon: '✖', color: c.red,     label: 'ERROR' },
  warn:  { icon: '⚠', color: c.yellow,  label: 'WARN ' },
  info:  { icon: '●', color: c.cyan,    label: 'INFO ' },
  http:  { icon: '→', color: c.blue,    label: 'HTTP ' },
  debug: { icon: '◉', color: c.magenta, label: 'DEBUG' },
};

/* ══════════════════════════════════════════════════════════════
   CONSOLE FORMAT  (coloured, human-readable)
══════════════════════════════════════════════════════════════ */
const isTTY = process.stdout.isTTY === true;

const consoleFormat = winston.format.printf(
  ({ level, message, timestamp, stack, ...meta }) => {
    const content = String(stack ?? message ?? '');
    if (!content) return '';

    const def = LEVELS[level] ?? LEVELS.info;

    const ts    = isTTY ? `${c.dim}${c.grey}${timestamp}${c.reset}` : timestamp as string;
    const badge = isTTY ? `${c.bold}${def.color}${def.icon} ${def.label}${c.reset}` : `${def.icon} ${def.label}`;
    const msg   = isTTY ? `${def.color}${content}${c.reset}` : content;

    // Extra metadata (omit symbols winston adds internally)
    const skip = new Set(['service', 'splat', 'ms']);
    const filtered = Object.fromEntries(
      Object.entries(meta).filter(([k]) => !skip.has(k))
    );
    const hasMeta = Object.keys(filtered).length > 0;
    const metaStr = hasMeta
      ? isTTY
        ? `\n${c.dim}${c.grey}         ↳ ${JSON.stringify(filtered, null, 0)}${c.reset}`
        : `\n         ↳ ${JSON.stringify(filtered, null, 0)}`
      : '';

    return `${ts}  ${badge}  ${msg}${metaStr}`;
  }
);

/* ══════════════════════════════════════════════════════════════
   FILE FORMAT  (plain JSON — no ANSI — easy to parse/grep)
══════════════════════════════════════════════════════════════ */
const fileFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.json()
);

/* ══════════════════════════════════════════════════════════════
   LOGGER
══════════════════════════════════════════════════════════════ */
/**
 * The log directory is created up front. The file transports use a relative
 * path, and the directory is gitignored, so on a fresh deploy it did not
 * exist: winston swallowed the ENOENT and every file log line was silently
 * discarded, leaving only the console transport.
 */
const LOG_DIR = path.resolve(process.cwd(), 'logs');
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
} catch {
  // Logging must never stop the application from booting.
}

export const logger = winston.createLogger({
  // `http` is *more* verbose than `info` in winston's npm level ordering, so
  // production was logging more than it needed to.
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  transports: [
    // ── Terminal ─────────────────────────────────────────────
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.errors({ stack: true }),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        consoleFormat
      ),
    }),

    // ── Error log (JSON, machine-parseable) ───────────────────
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
    }),

    // ── Combined log (JSON, machine-parseable) ────────────────
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
    }),
  ],
});
