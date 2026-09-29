/**
 * Product Group service — tenant-scoped CRUD.
 * Verified against backend product-group.controller.ts + DTOs.
 *
 *  - GET    /product-groups      → { success, data: ProductGroup[], meta }
 *  - GET    /product-groups/:id  → { success, data: ProductGroup }
 *  - POST   /product-groups      → { name, description? }
 *  - PUT    /product-groups/:id  → { name?, description?, isActive? }
 *  - DELETE /product-groups/:id  → soft-delete (409 when in use)
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

export interface ProductGroup {
  id: string
  companyId: string | null
  name: string
  description: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductGroupListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
}

export interface ProductGroupListResult {
  items: ProductGroup[]
  meta: ListMeta
}

export interface CreateProductGroupPayload {
  name: string
  description?: string
}

export interface UpdateProductGroupPayload {
  name?: string
  description?: string
  isActive?: boolean
}

function toQuery(params: ProductGroupListParams): Record<string, string | number> {
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

export const productGroupService = {
  async list(params: ProductGroupListParams): Promise<ProductGroupListResult> {
    const response = await httpClient.get<ApiListResponse<ProductGroup>>('/product-groups', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async create(payload: CreateProductGroupPayload): Promise<ProductGroup> {
    const response = await httpClient.post<ApiSuccess<ProductGroup>>('/product-groups', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateProductGroupPayload): Promise<ProductGroup> {
    const response = await httpClient.put<ApiSuccess<ProductGroup>>(
      `/product-groups/${id}`,
      payload,
    )
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/product-groups/${id}`)
  },
}
