import { Types } from 'mongoose';
import { AppError } from './errorHandler.js';

/**
 * Input validation helpers.
 *
 * The codebase validated the *presence* of a field but not its *type*, so a
 * number where a string was expected threw a TypeError inside a controller
 * and surfaced as a 500. A malformed client request is a 400, not a server
 * fault, and a stack trace is not an acceptable answer to "you sent the
 * wrong shape".
 */

export const assertString = (
  value: unknown,
  field: string,
  options: { min?: number; max?: number; optional?: boolean; trim?: boolean } = {}
): string | undefined => {
  if (value === undefined || value === null) {
    if (options.optional) return undefined;
    throw new AppError(`${field} is required`, 400);
  }
  if (typeof value !== 'string') {
    throw new AppError(`${field} must be a string`, 400);
  }
  const cleaned = options.trim === false ? value : value.trim();
  if (options.min !== undefined && cleaned.length < options.min) {
    throw new AppError(`${field} must be at least ${options.min} characters`, 400);
  }
  if (options.max !== undefined && cleaned.length > options.max) {
    throw new AppError(`${field} must be at most ${options.max} characters`, 400);
  }
  return cleaned;
};

export const assertNumber = (
  value: unknown,
  field: string,
  options: { min?: number; max?: number; integer?: boolean; optional?: boolean } = {}
): number | undefined => {
  if (value === undefined || value === null || value === '') {
    if (options.optional) return undefined;
    throw new AppError(`${field} is required`, 400);
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  if (options.integer && !Number.isInteger(numeric)) {
    throw new AppError(`${field} must be a whole number`, 400);
  }
  if (options.min !== undefined && numeric < options.min) {
    throw new AppError(`${field} must be at least ${options.min}`, 400);
  }
  if (options.max !== undefined && numeric > options.max) {
    throw new AppError(`${field} must be at most ${options.max}`, 400);
  }
  return numeric;
};

export const assertBoolean = (value: unknown, field: string): boolean => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  throw new AppError(`${field} must be a boolean`, 400);
};

export const assertEnum = <T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[]
): T => {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new AppError(`${field} must be one of: ${allowed.join(', ')}`, 400);
  }
  return value as T;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const assertEmail = (value: unknown, field = 'email'): string => {
  const email = assertString(value, field, { min: 3, max: 254 });
  if (!EMAIL_PATTERN.test(email as string)) {
    throw new AppError(`${field} must be a valid email address`, 400);
  }
  return (email as string).toLowerCase();
};

/**
 * Validates that a value is a usable Mongo ObjectId. Without this, a
 * malformed id in a path produced a CastError and a 500.
 */
export const assertObjectId = (value: unknown, field = 'id'): string => {
  const raw = assertString(value, field, { max: 64 });
  if (!Types.ObjectId.isValid(raw as string)) {
    throw new AppError(`${field} is not a valid identifier`, 400);
  }
  return raw as string;
};

export const assertObjectIdOptional = (
  value: unknown,
  field = 'id'
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return assertObjectId(value, field);
};

export const assertArray = <T = unknown>(
  value: unknown,
  field: string,
  options: { max?: number; optional?: boolean } = {}
): T[] => {
  if (value === undefined || value === null) {
    if (options.optional) return [];
    throw new AppError(`${field} is required`, 400);
  }
  if (!Array.isArray(value)) {
    throw new AppError(`${field} must be an array`, 400);
  }
  if (options.max !== undefined && value.length > options.max) {
    throw new AppError(`${field} must contain at most ${options.max} items`, 400);
  }
  return value as T[];
};

/**
 * Parses an optional date, rejecting an unparseable value instead of storing
 * an Invalid Date.
 */
export const assertDate = (
  value: unknown,
  field: string,
  options: { optional?: boolean } = {}
): Date | undefined => {
  if (value === undefined || value === null || value === '') {
    if (options.optional) return undefined;
    throw new AppError(`${field} is required`, 400);
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} must be a valid date`, 400);
  }
  return date;
};

export default {
  assertString,
  assertNumber,
  assertBoolean,
  assertEnum,
  assertEmail,
  assertObjectId,
  assertObjectIdOptional,
  assertArray,
  assertDate,
};
