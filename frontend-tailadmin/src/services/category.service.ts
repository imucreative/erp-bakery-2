/**
 * Category service — tenant-scoped CRUD for product categories.
 * Verified against backend category.controller.ts + DTOs + ProductCategory entity.
 *
 *  - GET    /categories      → { success, data: Category[], meta } (filter: search, isActive, productGroupId)
 *  - GET    /categories/:id  → { success, data: Category }
 *  - POST   /categories      → { productGroupId, name, description? }
 *  - PUT    /categories/:id  → { name?, description?, isActive? }  (group NOT changeable)
 *  - DELETE /categories/:id  → soft-delete (409 when in use)
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

export interface Category {
  id: string
  companyId: string | null
  productGroupId: string
  code: string
  name: string
  description: string | null
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CategoryListParams {
  page: number
  limit: number
  search?: string
  isActive?: 'true' | 'false'
  productGroupId?: string
}

export interface CategoryListResult {
  items: Category[]
  meta: ListMeta
}

export interface CreateCategoryPayload {
  productGroupId: string
  name: string
  description?: string
}

export interface UpdateCategoryPayload {
  name?: string
  description?: string
  isActive?: boolean
}

function toQuery(params: CategoryListParams): Record<string, string | number> {
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
  if (params.productGroupId) {
    query.productGroupId = params.productGroupId
  }
  return query
}

export const categoryService = {
  async list(params: CategoryListParams): Promise<CategoryListResult> {
    const response = await httpClient.get<ApiListResponse<Category>>('/categories', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async create(payload: CreateCategoryPayload): Promise<Category> {
    const response = await httpClient.post<ApiSuccess<Category>>('/categories', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateCategoryPayload): Promise<Category> {
    const response = await httpClient.put<ApiSuccess<Category>>(`/categories/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/categories/${id}`)
  },
}
