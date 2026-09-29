/**
 * Supplier service — tenant-scoped CRUD for suppliers.
 * Verified against backend supplier.controller.ts + DTOs.
 *
 *  - GET    /suppliers      → { success, data: Supplier[], meta } (paginated)
 *  - GET    /suppliers/:id  → { success, data: Supplier }
 *  - POST   /suppliers      → { name, address?, phone?, picName? }
 *  - PUT    /suppliers/:id  → { name?, address?, phone?, picName?, isActive? }
 *  - DELETE /suppliers/:id  → soft-delete (409 when in use)
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

export interface Supplier {
  id: string
  companyId: string | null
  name: string
  address: string | null
  phone: string | null
  picName: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SupplierListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
}

export interface SupplierListResult {
  items: Supplier[]
  meta: ListMeta
}

export interface CreateSupplierPayload {
  name: string
  address?: string
  phone?: string
  picName?: string
}

export interface UpdateSupplierPayload {
  name?: string
  address?: string
  phone?: string
  picName?: string
  isActive?: boolean
}

function toQuery(params: SupplierListParams): Record<string, string | number> {
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

export const supplierService = {
  async list(params: SupplierListParams): Promise<SupplierListResult> {
    const response = await httpClient.get<ApiListResponse<Supplier>>('/suppliers', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async create(payload: CreateSupplierPayload): Promise<Supplier> {
    const response = await httpClient.post<ApiSuccess<Supplier>>('/suppliers', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateSupplierPayload): Promise<Supplier> {
    const response = await httpClient.put<ApiSuccess<Supplier>>(`/suppliers/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/suppliers/${id}`)
  },
}
