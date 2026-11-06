/**
 * Platform company service — cross-tenant tenant management (SUPER_ADMIN only).
 * Verified against backend company.controller.ts:
 *  - GET   /companies            → { success, data: PlatformCompanyItem[], meta }
 *  - PATCH /companies/:id/status → { success, data: { id, isActive } }
 *
 * Tenant-scoped company profile lives in `company.service.ts`.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

interface ListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

interface ApiListResponse<T> {
  success: true
  data: T[]
  meta: ListMeta
}

export interface PlatformCompanyItem {
  id: string
  code: string
  name: string
  slug: string
  phone: string | null
  isActive: boolean
  userCount: number
  createdAt: string
}

export interface PlatformCompanyListParams {
  page: number
  limit: number
  search?: string
}

export interface PlatformCompanyListResult {
  items: PlatformCompanyItem[]
  meta: ListMeta
}

export const platformCompanyService = {
  /** Paginated tenant list (super admin only). */
  async list(params: PlatformCompanyListParams): Promise<PlatformCompanyListResult> {
    const query: Record<string, string | number> = {
      page: params.page,
      limit: params.limit,
    }
    if (params.search?.trim()) {
      query.search = params.search.trim()
    }

    const response = await httpClient.get<ApiListResponse<PlatformCompanyItem>>('/companies', {
      params: query,
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  /** Activate or suspend a tenant (super admin only). */
  async setStatus(id: string, isActive: boolean): Promise<{ id: string; isActive: boolean }> {
    const response = await httpClient.patch<ApiSuccess<{ id: string; isActive: boolean }>>(
      `/companies/${id}/status`,
      { isActive },
    )
    return response.data.data
  },
}
