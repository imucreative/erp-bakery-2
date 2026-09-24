/**
 * Standardised API response shapes.
 *
 * All controllers use these helpers so the response envelope is consistent:
 *
 *   Success (single):  { success: true, data: T }
 *   Success (list):    { success: true, data: T[], meta: PaginationMeta }
 *   Created:           { success: true, data: T }            HTTP 201
 *   Error:             { success: false, message, errors }   (set by AllExceptionsFilter)
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/** Single resource or object response */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return { success: true, data };
}

/** Paginated list response */
export function listResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): ApiListResponse<T> {
  return {
    success: true,
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
