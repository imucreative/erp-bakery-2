/**
 * Product UOM conversion service — tenant-scoped CRUD for a product's
 * alternative units of measure (Tahap 1 / master data konversi).
 *
 * Model: a product has a base unit (products.uomId, implicit factor 1) plus a
 * list of ALTERNATIVE units with a factor. Meaning of the factor:
 *   1 <alternative uom> = factorToBase <base unit>
 * Example: base = gram; add "Karung" with factorToBase = 25000
 *   → 1 Karung = 25.000 gram.
 *
 * Verified against the backend sub-resource contract (guards: product.read for
 * list, product.manage for writes):
 *
 *  - GET    /products/:productId/uom-conversions
 *      → { success, data: ProductUomConversion[] }
 *  - POST   /products/:productId/uom-conversions
 *      → { uomId, factorToBase, isActive? } → 201 { success, data: item }
 *      errors: 400 (factor<=0 / uom=base UOM_IS_BASE_UNIT / uom inactive),
 *              404, 409 PRODUCT_UOM_CONVERSION.DUPLICATE
 *  - PUT    /products/:productId/uom-conversions/:id
 *      → { factorToBase?, isActive? } (min 1 field) → 200 { success, data: item }
 *  - DELETE /products/:productId/uom-conversions/:id → 200 (data: null), 404
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface ProductUomConversion {
  id: string
  productId: string
  uomId: string
  uomCode: string
  uomName: string
  factorToBase: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateProductUomConversionPayload {
  uomId: string
  factorToBase: number
  isActive?: boolean
}

export interface UpdateProductUomConversionPayload {
  factorToBase?: number
  isActive?: boolean
}

export const productUomConversionService = {
  async list(productId: string): Promise<ProductUomConversion[]> {
    const response = await httpClient.get<ApiSuccess<ProductUomConversion[]>>(
      `/products/${productId}/uom-conversions`,
    )
    return response.data.data
  },

  async create(
    productId: string,
    payload: CreateProductUomConversionPayload,
  ): Promise<ProductUomConversion> {
    const response = await httpClient.post<ApiSuccess<ProductUomConversion>>(
      `/products/${productId}/uom-conversions`,
      payload,
    )
    return response.data.data
  },

  async update(
    productId: string,
    id: string,
    payload: UpdateProductUomConversionPayload,
  ): Promise<ProductUomConversion> {
    const response = await httpClient.put<ApiSuccess<ProductUomConversion>>(
      `/products/${productId}/uom-conversions/${id}`,
      payload,
    )
    return response.data.data
  },

  async remove(productId: string, id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/products/${productId}/uom-conversions/${id}`)
  },
}
