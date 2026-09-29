/**
 * Role service — READ-ONLY (verified against backend role.controller.ts).
 * Roles are seed-controlled (ADR-0015); there is no create/update/delete.
 *
 *  - GET /roles      → { success, data: Role[] }        (NOT paginated)
 *  - GET /roles/:id  → { success, data: RoleDetail }    (role + permission codes)
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
}
