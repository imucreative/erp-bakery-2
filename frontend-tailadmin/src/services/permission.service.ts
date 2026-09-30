/**
 * Permission service — READ-ONLY catalog of permission metadata used to render
 * the Role permission picker (Business Domain → Module → Action, doc 35 §3).
 * Verified against backend permission.controller.ts (ADR 49 §3).
 *
 *  - GET /permissions → { success, data: Permission[] }
 *    (guard role.read; ordered by sortOrder ASC)
 *
 * Metadata columns (domain/moduleKey/moduleName/action/sortOrder) may be null
 * for legacy permissions still awaiting backfill; callers must handle null.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface Permission {
  id: string
  code: string
  name: string
  domain: string | null
  moduleKey: string | null
  moduleName: string | null
  action: string | null
  sortOrder: number | null
}

export const permissionService = {
  /** Global permission catalog (not paginated), ordered by sortOrder ASC. */
  async list(): Promise<Permission[]> {
    const response = await httpClient.get<ApiSuccess<Permission[]>>('/permissions')
    return response.data.data
  },
}
