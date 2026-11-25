import { AppError } from './errorHandler.js';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 200;
export const MAX_PAGE = 10_000;

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

const toPositiveInt = (value: unknown, fallback: number): number => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

/**
 * Parses `?page=&limit=` into a bounded pagination window.
 * `limit` is clamped to MAX_LIMIT so a caller cannot ask the database for the
 * whole tenant collection in one round trip.
 */
export const parsePagination = (query: Record<string, unknown>): PaginationParams => {
  // The page is capped so a caller cannot ask for a skip of ten billion
  // documents, which turns into a full collection scan on the server.
  const page = Math.min(toPositiveInt(query.page, DEFAULT_PAGE), MAX_PAGE);
  const requestedLimit = toPositiveInt(query.limit, DEFAULT_LIMIT);
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  return { page, limit, skip: (page - 1) * limit };
};

export const buildPaginationMeta = (
  total: number,
  { page, limit }: PaginationParams
): PaginationMeta => {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Rejects a caller supplied sort key that is not in the allow list, so the
 * sort direction cannot be used to probe or abuse the field index.
 */
export const parseSort = (
  query: Record<string, unknown>,
  allowed: Record<string, 1 | -1>,
  fallback: Record<string, 1 | -1>
): Record<string, 1 | -1> => {
  const rawField = typeof query.sort === 'string' ? query.sort.trim() : '';
  // `Object.hasOwn` rather than `in`, so a query of `?sort=toString` cannot
  // match an inherited Object.prototype member.
  const field = Object.prototype.hasOwnProperty.call(allowed, rawField)
    ? rawField
    : Object.keys(fallback)[0];
  const direction = query.order === 'asc' ? 1 : query.order === 'desc' ? -1 : fallback[field];
  return { [field]: direction };
};

export const assertSortField = (field: string, allowed: string[]): void => {
  if (!allowed.includes(field)) {
    throw new AppError(`Unsupported sort field: ${field}`, 400);
  }
};
