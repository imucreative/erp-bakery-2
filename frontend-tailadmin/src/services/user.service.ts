/**
 * User service — tenant-scoped user management.
 * Verified against backend user.controller.ts + DTOs + UserRepository.
 *
 *  - GET    /users      → { success, data: User[], meta } (filter: search, roleId, isActive)
 *  - GET    /users/:id  → { success, data: UserDetail } (role + outlets)
 *  - POST   /users      → { name, email, password(min8), phone?, roleId, outletIds? }  (409 dup email)
 *  - PUT    /users/:id  → { name?, phone?, roleId?, isActive?, outletIds? }  (no email/password)
 *  - DELETE /users/:id  → soft-delete
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

/** List row (no role name; resolve via roles). */
export interface User {
  id: string
  companyId: string | null
  roleId: string | null
  name: string
  email: string
  phone: string | null
  isSuperAdmin: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UserOutletRef {
  outletId: string
  code: string
  name: string
  isActive: boolean
}

export interface UserDetail extends User {
  roleCode: string | null
  roleName: string | null
  outlets: UserOutletRef[]
}

/** Returned by create (no password ever exposed). */
export interface CreatedUser {
  id: string
  name: string
  email: string
}

export interface UserListParams {
  page: number
  limit: number
  search?: string
  roleId?: string
  isActive?: 'true' | 'false'
}

export interface UserListResult {
  items: User[]
  meta: ListMeta
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  phone?: string
  roleId: string
  outletIds?: string[]
}

export interface UpdateUserPayload {
  name?: string
  phone?: string
  roleId?: string
  isActive?: boolean
  outletIds?: string[]
}

function toQuery(params: UserListParams): Record<string, string | number> {
  const query: Record<string, string | number> = { page: params.page, limit: params.limit }
  if (params.search) {
    query.search = params.search
  }
  if (params.roleId) {
    query.roleId = params.roleId
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive
  }
  return query
}

export const userService = {
  async list(params: UserListParams): Promise<UserListResult> {
    const response = await httpClient.get<ApiListResponse<User>>('/users', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<UserDetail> {
    const response = await httpClient.get<ApiSuccess<UserDetail>>(`/users/${id}`)
    return response.data.data
  },

  async create(payload: CreateUserPayload): Promise<CreatedUser> {
    const response = await httpClient.post<ApiSuccess<CreatedUser>>('/users', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateUserPayload): Promise<User> {
    const response = await httpClient.put<ApiSuccess<User>>(`/users/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/users/${id}`)
  },
}
