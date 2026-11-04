/**
 * Platform service — cross-tenant reads for the platform console.
 * Verified against backend platform.controller.ts:
 *  - GET /platform/users → { success, data: PlatformUserItem[], meta }  (SUPER_ADMIN only)
 *
 * Read-only by design: the platform console must not mutate tenant data.
 */

import { httpClient } from './http'

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

export interface PlatformUserItem {
  id: string
  name: string
  email: string
  phone: string | null
  isActive: boolean
  isSuperAdmin: boolean
  companyId: string | null
  companyName: string | null
  roleId: string | null
  roleName: string | null
  roleCode: string | null
  createdAt: string
}

export interface PlatformUserListParams {
  page: number
  limit: number
  search?: string
  companyId?: string
}

export interface PlatformUserListResult {
  items: PlatformUserItem[]
  meta: ListMeta
}

export const platformService = {
  /** Paginated cross-tenant user list (super admin only). */
  async listUsers(params: PlatformUserListParams): Promise<PlatformUserListResult> {
    const query: Record<string, string | number> = {
      page: params.page,
      limit: params.limit,
    }
    if (params.search?.trim()) {
      query.search = params.search.trim()
    }
    if (params.companyId) {
      query.companyId = params.companyId
    }

    const response = await httpClient.get<ApiListResponse<PlatformUserItem>>('/platform/users', {
      params: query,
    })
    return { items: response.data.data, meta: response.data.meta }
  },
}
