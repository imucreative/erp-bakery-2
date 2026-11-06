/**
 * Platform service — cross-tenant identity and access management for the
 * platform console.
 * Verified against backend platform.controller.ts:
 *  - GET    /platform/users                                   → { success, data, meta }
 *  - GET    /platform/companies/:companyId/roles              → { success, data }
 *  - GET    /platform/companies/:companyId/roles/:roleId      → { success, data }
 *  - POST   /platform/companies/:companyId/roles              → 201
 *  - PUT    /platform/companies/:companyId/roles/:roleId      → 200
 *  - DELETE /platform/companies/:companyId/roles/:roleId      → 200
 *  - GET    /platform/permissions                             → { success, data }
 * All routes are SUPER_ADMIN only (with 2FA).
 */

import { httpClient } from './http'
import type { CreateRolePayload, Role, RoleDetail, UpdateRolePayload } from './role.service'
import type { Permission } from './permission.service'

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

export interface PlatformRoleItem extends Role {
  /** Active (non-deleted) users currently assigned to this role. */
  userCount: number
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

  async getRole(companyId: string, roleId: string): Promise<RoleDetail> {
    const response = await httpClient.get<ApiSuccess<RoleDetail>>(
      `/platform/companies/${companyId}/roles/${roleId}`,
    )
    return response.data.data
  },

  /** Global permission catalog for the platform role picker. */
  async listPermissions(): Promise<Permission[]> {
    const response = await httpClient.get<ApiSuccess<Permission[]>>('/platform/permissions')
    return response.data.data
  },

  async createRole(companyId: string, payload: CreateRolePayload): Promise<RoleDetail> {
    const response = await httpClient.post<ApiSuccess<RoleDetail>>(
      `/platform/companies/${companyId}/roles`,
      payload,
    )
    return response.data.data
  },

  async updateRole(
    companyId: string,
    roleId: string,
    payload: UpdateRolePayload,
  ): Promise<RoleDetail> {
    const response = await httpClient.put<ApiSuccess<RoleDetail>>(
      `/platform/companies/${companyId}/roles/${roleId}`,
      payload,
    )
    return response.data.data
  },

  async deleteRole(companyId: string, roleId: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/platform/companies/${companyId}/roles/${roleId}`)
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
