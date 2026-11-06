/**
 * Platform service — cross-tenant reads for the platform console.
 * Verified against backend platform.controller.ts:
 *  - GET /platform/users → { success, data: PlatformUserItem[], meta }  (SUPER_ADMIN only)
 *
 * User mutations are limited to identity/access management on the platform.
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

interface ApiSuccess<T> {
  success: true
  data: T
  message?: string
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

export interface PlatformRoleItem {
  id: string
  companyId: string
  code: string
  name: string
  isActive: boolean
}

export interface PlatformCreateUserPayload {
  name: string
  email: string
  password: string
  phone?: string
  companyId: string
  roleId: string
}

export interface PlatformUpdateUserPayload {
  name?: string
  phone?: string
  companyId?: string
  roleId?: string
  isActive?: boolean
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

  async listRoles(companyId: string): Promise<PlatformRoleItem[]> {
    const response = await httpClient.get<ApiSuccess<PlatformRoleItem[]>>(
      `/platform/companies/${companyId}/roles`,
    )
    return response.data.data
  },

  async createUser(payload: PlatformCreateUserPayload): Promise<PlatformUserItem> {
    const response = await httpClient.post<ApiSuccess<PlatformUserItem>>('/platform/users', payload)
    return response.data.data
  },

  async updateUser(id: string, payload: PlatformUpdateUserPayload): Promise<PlatformUserItem> {
    const response = await httpClient.put<ApiSuccess<PlatformUserItem>>(
      `/platform/users/${id}`,
      payload,
    )
    return response.data.data
  },

  async deleteUser(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/platform/users/${id}`)
  },
}
