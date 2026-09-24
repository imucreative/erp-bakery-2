/**
 * Parses and normalises pagination query params.
 *
 * Usage:
 *   const { page, limit, offset } = parsePagination(query);
 *   const rows = await pool.query('SELECT ... LIMIT $1 OFFSET $2', [limit, offset]);
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
}): PaginationParams {
  // Use isNaN check — avoids falsy-zero bug where parseInt('0') || default = default
  const parsedPage = parseInt(String(query.page ?? ''), 10);
  const parsedLimit = parseInt(String(query.limit ?? ''), 10);

  const page = Math.max(1, isNaN(parsedPage) ? 1 : parsedPage);
  const limit = Math.min(100, Math.max(1, isNaN(parsedLimit) ? 10 : parsedLimit));
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}
