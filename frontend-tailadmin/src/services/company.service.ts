/**
 * Company service — platform-level tenant management.
 * Verified against backend company.controller.ts:
 *  - GET   /companies             → { success, data: CompanyListItem[], meta }  (SUPER_ADMIN only)
 *  - PATCH /companies/:id/status  → { success, data: { id, isActive } }        (SUPER_ADMIN only)
 *
 * These endpoints are platform-level: a super admin has no company context,
 * so they must NOT be mixed with the tenant-scoped services.
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

export interface CompanyListItem {
  id: string
  code: string
  name: string
  slug: string
  phone: string | null
  isActive: boolean
  userCount: number
  createdAt: string
}

export interface CompanyListParams {
  page: number
  limit: number
  search?: string
}

export interface CompanyListResult {
  items: CompanyListItem[]
  meta: ListMeta
}

export const companyService = {
  /** Paginated tenant list (super admin only). */
  async list(params: CompanyListParams): Promise<CompanyListResult> {
    const query: Record<string, string | number> = {
      page: params.page,
      limit: params.limit,
    }
    if (params.search?.trim()) {
      query.search = params.search.trim()
    }

    const response = await httpClient.get<ApiListResponse<CompanyListItem>>('/companies', {
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
