/**
 * List endpoints return a consistent envelope: `{ <collection>, pagination }`.
 *
 * `listOf` unwraps that envelope but still accepts a bare array, so a cached
 * response or an older backend deployment does not break the UI.
 */
export const listOf = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload[key])) {
    return payload[key];
  }
  return [];
};

export const paginationOf = (payload) => {
  if (payload && typeof payload === 'object' && payload.pagination) {
    return payload.pagination;
  }
  return null;
};

export default listOf;
