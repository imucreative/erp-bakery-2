/**
 * Role service — tenant-scoped Dynamic Role Management (ADR 49).
 * Roles are now mutable (create/update/delete) with a permission picker;
 * platform roles are excluded by the backend. Verified against backend
 * role.controller.ts + DTOs.
 *
 *  - GET    /roles      → { success, data: Role[] }        (NOT paginated)
 *  - GET    /roles/:id  → { success, data: RoleDetail }    (role + permission codes)
 *  - POST   /roles      → { code, name, description?, permissions: string[] } (201)
 *  - PUT    /roles/:id  → { name?, description?, permissions?: string[] } (code IMMUTABLE)
 *  - DELETE /roles/:id  → 200 (409 when OWNER or in use)
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface Role {
  id: string
  companyId: string | null
  code: string
  name: string
  description: string | null
  isActive: boolean
}

export interface RoleDetail extends Role {
  permissions: string[]
}

export interface CreateRolePayload {
  code: string
  name: string
  description?: string
  permissions: string[]
}

export interface UpdateRolePayload {
  name?: string
  description?: string
  /** Full replace: send the complete set of checked permission codes. */
  permissions?: string[]
}

export const roleService = {
  /** List all roles for the acting user's company (not paginated). */
  async list(): Promise<Role[]> {
    const response = await httpClient.get<ApiSuccess<Role[]>>('/roles')
    return response.data.data
  },

  /** Fetch a single role with its assigned permission codes. */
  async getById(id: string): Promise<RoleDetail> {
    const response = await httpClient.get<ApiSuccess<RoleDetail>>(`/roles/${id}`)
    return response.data.data
  },

  /** Create a role with its initial permission set. `code` is trimmed + uppercased server-side. */
  async create(payload: CreateRolePayload): Promise<RoleDetail> {
    const response = await httpClient.post<ApiSuccess<RoleDetail>>('/roles', payload)
    return response.data.data
  },

  /** Update name/description and/or full-sync permissions. `code` is IMMUTABLE — never send it. */
  async update(id: string, payload: UpdateRolePayload): Promise<RoleDetail> {
    const response = await httpClient.put<ApiSuccess<RoleDetail>>(`/roles/${id}`, payload)
    return response.data.data
  },

  /** Delete a role (409 when OWNER or still assigned to users). */
  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/roles/${id}`)
  },
}
