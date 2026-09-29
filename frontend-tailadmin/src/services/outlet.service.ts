/**
 * Outlet service — read helper used to populate the outlet-assignment picker in
 * the Users module. (Full outlet CRUD is out of scope here.)
 *
 *  - GET /outlets → { success, data: Outlet[], meta } (paginated; filter: search, isActive)
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

export interface Outlet {
  id: string
  companyId: string | null
  code: string
  name: string
  isActive: boolean
}

export interface OutletListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
}

export interface OutletListResult {
  items: Outlet[]
  meta: ListMeta
}

export const outletService = {
  async list(params: OutletListParams): Promise<OutletListResult> {
    const query: Record<string, string | number> = { page: params.page, limit: params.limit }
    if (params.search) {
      query.search = params.search
    }
    if (params.isActive !== undefined) {
      query.isActive = params.isActive
    }
    const response = await httpClient.get<ApiListResponse<Outlet>>('/outlets', { params: query })
    return { items: response.data.data, meta: response.data.meta }
  },
}
