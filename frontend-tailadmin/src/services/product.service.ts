/**
 * Product service — tenant-scoped CRUD for products (the multi-relation master).
 * Verified against backend product.controller.ts + DTOs + Product entity.
 *
 *  - GET    /products      → { success, data: Product[], meta }
 *      filters: search, productType, productGroupId, categoryId, supplierId, isActive
 *  - GET    /products/:id  → { success, data: Product }
 *  - POST   /products      → { sku, name, productGroupId, categoryId, uomId, supplierId,
 *                              productType, barcode?, purchasePrice?, sellingPrice?,
 *                              minimumStock?, shelfLifeDays?, isBatchTracked?, hasToppings? }
 *  - PUT    /products/:id  → { name?, barcode?, productType?, purchasePrice?, sellingPrice?,
 *                              minimumStock?, shelfLifeDays?, isBatchTracked?, hasToppings?, isActive? }
 *      (sku + relations group/category/uom/supplier are NOT changeable on update)
 *  - DELETE /products/:id  → soft-delete (409 when in use)
 */

import { httpClient } from './http'

export const PRODUCT_TYPES = [
  'RAW_MATERIAL',
  'FINISHED_GOODS',
  'SEMI_FINISHED',
  'PACKAGING',
] as const
export type ProductType = (typeof PRODUCT_TYPES)[number]

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  RAW_MATERIAL: 'Bahan Baku',
  FINISHED_GOODS: 'Barang Jadi',
  SEMI_FINISHED: 'Setengah Jadi',
  PACKAGING: 'Kemasan',
}

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

export interface Product {
  id: string
  companyId: string | null
  sku: string
  barcode: string | null
  name: string
  productGroupId: string
  categoryId: string
  uomId: string
  supplierId: string
  productType: ProductType
  purchasePrice: number
  sellingPrice: number
  minimumStock: number
  shelfLifeDays: number
  isBatchTracked: boolean
  hasToppings: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface ProductListParams {
  page: number
  limit: number
  search?: string
  productType?: ProductType
  productGroupId?: string
  categoryId?: string
  supplierId?: string
  isActive?: 'true' | 'false'
}

export interface ProductListResult {
  items: Product[]
  meta: ListMeta
}

export interface CreateProductPayload {
  sku: string
  barcode?: string
  name: string
  productGroupId: string
  categoryId: string
  uomId: string
  supplierId: string
  productType: ProductType
  purchasePrice?: number
  sellingPrice?: number
  minimumStock?: number
  shelfLifeDays?: number
  isBatchTracked?: boolean
  hasToppings?: boolean
}

export interface UpdateProductPayload {
  name?: string
  barcode?: string
  productType?: ProductType
  purchasePrice?: number
  sellingPrice?: number
  minimumStock?: number
  shelfLifeDays?: number
  isBatchTracked?: boolean
  hasToppings?: boolean
  isActive?: boolean
}

function toQuery(params: ProductListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.productType) {
    query.productType = params.productType
  }
  if (params.productGroupId) {
    query.productGroupId = params.productGroupId
  }
  if (params.categoryId) {
    query.categoryId = params.categoryId
  }
  if (params.supplierId) {
    query.supplierId = params.supplierId
  }
  if (params.isActive !== undefined) {
    query.isActive = params.isActive
  }
  return query
}

export const productService = {
  async list(params: ProductListParams): Promise<ProductListResult> {
    const response = await httpClient.get<ApiListResponse<Product>>('/products', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<Product> {
    const response = await httpClient.get<ApiSuccess<Product>>(`/products/${id}`)
    return response.data.data
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const response = await httpClient.post<ApiSuccess<Product>>('/products', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateProductPayload): Promise<Product> {
    const response = await httpClient.put<ApiSuccess<Product>>(`/products/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/products/${id}`)
  },
}
