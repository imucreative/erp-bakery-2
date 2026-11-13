/**
 * UOM service — tenant-scoped CRUD for units of measure.
 * Verified against backend uom.controller.ts + DTOs.
 *
 *  - GET    /uoms      → { success, data: Uom[], meta } (paginated)
 *  - GET    /uoms/:id  → { success, data: Uom }
 *  - POST   /uoms      → { name, dimension, factorToCanonical } → { success, data: Uom }
 *  - PUT    /uoms/:id  → { name?, dimension?, factorToCanonical?, isActive? } → { success, data: Uom }
 *  - DELETE /uoms/:id  → soft-delete (409 when in use)
 *
 * Global conversion (doc 52): `dimension` is a code from the global
 * `uom_dimensions` reference table (see uom-dimension.service.ts) and
 * `1 UOM = factorToCanonical <canonical unit>` of that dimension. The canonical
 * unit is the smallest unit, so factor is always >= 1.
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

export interface Uom {
  id: string
  companyId: string | null
  code: string
  name: string
  isActive: boolean
  dimension: string | null
  factorToCanonical: number | null
  createdAt?: string
  updatedAt?: string
}

export interface UomListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
}

export interface UomListResult {
  items: Uom[]
  meta: ListMeta
}

export interface CreateUomPayload {
  name: string
  dimension: string
  factorToCanonical: number
}

export interface UpdateUomPayload {
  name?: string
  isActive?: boolean
  dimension?: string
  factorToCanonical?: number
}

function toQuery(params: UomListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive
  }
  return query
}

export const uomService = {
  async list(params: UomListParams): Promise<UomListResult> {
    const response = await httpClient.get<ApiListResponse<Uom>>('/uoms', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async create(payload: CreateUomPayload): Promise<Uom> {
    const response = await httpClient.post<ApiSuccess<Uom>>('/uoms', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateUomPayload): Promise<Uom> {
    const response = await httpClient.put<ApiSuccess<Uom>>(`/uoms/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/uoms/${id}`)
  },
}
