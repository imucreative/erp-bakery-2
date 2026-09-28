/**
 * Outlet service — read access to the tenant-scoped Outlets endpoint (verified
 * in backend/src/Interfaces/http/api/outlets/outlet.controller.ts). Only the
 * list read is exposed here; it backs the outlet dropdown when assigning
 * outlets to a user. Requires `outlet.read`.
 *
 * The list endpoint is paginated: `{ success, data: Outlet[], meta }`.
 */

import { httpClient } from '@/lib/api';
import type { ApiListResponse, ListMeta } from '@/types/api';
import type { Outlet, OutletListParams } from '@/types/outlet';

export interface OutletListResult {
  items: Outlet[];
  meta: ListMeta;
}

function toQueryParams(params: OutletListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  };
  if (params.search) {
    query.search = params.search;
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive;
  }
  return query;
}

export const outletService = {
  /** List outlets for the acting user's company (paginated + filtered). */
  async list(params: OutletListParams): Promise<OutletListResult> {
    const response = await httpClient.get<ApiListResponse<Outlet>>('/outlets', {
      params: toQueryParams(params),
    });
    return { items: response.data.data, meta: response.data.meta };
  },
};
