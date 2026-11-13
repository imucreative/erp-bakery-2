/**
 * Product type reference service.
 *
 * The backend `product_types` table is the source of truth. Product forms load
 * the active list; the master-data page requests inactive rows too.
 *
 *  - GET    /product-types?includeInactive=true → { success, data: ProductType[] }
 *  - POST   /product-types                      → { code, name, description?, sortOrder?, isActive? }
 *  - PUT    /product-types/:code                → { name?, description?, sortOrder?, isActive? }
 *  - DELETE /product-types/:code                → hard-delete (409 when used by products)
 */
import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ProductTypeOption {
  code: string
  name: string
  description: string | null
  isActive: boolean
}

export interface ProductTypeListParams {
  includeInactive?: boolean
}

export interface CreateProductTypePayload {
  code: string
  name: string
  description?: string
  isActive?: boolean
}

export interface UpdateProductTypePayload {
  name?: string
  description?: string | null
  isActive?: boolean
}

export const productTypeService = {
  async list(params: ProductTypeListParams = {}): Promise<ProductTypeOption[]> {
    const response = await httpClient.get<ApiSuccess<ProductTypeOption[]>>('/product-types', {
      params: params.includeInactive ? { includeInactive: 'true' } : undefined,
    })
    return response.data.data
  },

  async create(payload: CreateProductTypePayload): Promise<ProductTypeOption> {
    const response = await httpClient.post<ApiSuccess<ProductTypeOption>>(
      '/product-types',
      payload,
    )
    return response.data.data
  },

  async update(code: string, payload: UpdateProductTypePayload): Promise<ProductTypeOption> {
    const response = await httpClient.put<ApiSuccess<ProductTypeOption>>(
      `/product-types/${encodeURIComponent(code)}`,
      payload,
    )
    return response.data.data
  },

  async remove(code: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/product-types/${encodeURIComponent(code)}`)
  },
}
