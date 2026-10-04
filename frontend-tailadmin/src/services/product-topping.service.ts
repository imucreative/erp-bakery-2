/**
 * Product topping service — tenant-scoped CRUD for the toppings allowed on a
 * single sellable product (made-to-order + topping POS model).
 *
 * Model: a product (biasanya FINISHED_GOODS yang dijual made-to-order) punya
 * daftar topping yang diizinkan. Setiap topping menunjuk ke produk lain
 * (toppingProductId) bertipe RAW_MATERIAL / SEMI_FINISHED, dengan takaran per
 * item (defaultQtyPerItem dalam satuan dasar topping) dan harga tambahan
 * (extraPrice) yang dibebankan ke pelanggan saat dipilih.
 *
 * Verified against the backend sub-resource contract (guards: product.read for
 * list, product.manage for writes):
 *
 *  - GET    /products/:productId/toppings
 *      → { success, data: ProductTopping[] }
 *  - POST   /products/:productId/toppings
 *      → { toppingProductId, defaultQtyPerItem (>0), extraPrice (>=0, default 0),
 *          sortOrder?, isActive? } → 201 { success, data: item }
 *      errors: 400 PRODUCT_TOPPING.INVALID_TOPPING_TYPE (topping harus
 *              RAW_MATERIAL / SEMI_FINISHED), 400 PRODUCT_TOPPING.SELF_TOPPING,
 *              404 PRODUCT_TOPPING.NOT_FOUND, 409 PRODUCT_TOPPING.DUPLICATE
 *  - PUT    /products/:productId/toppings/:id
 *      → { defaultQtyPerItem?, extraPrice?, sortOrder?, isActive? } (min 1 field)
 *      → 200 { success, data: item }
 *  - DELETE /products/:productId/toppings/:id → 200 (data: null), 404
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface ProductTopping {
  id: string
  productId: string
  toppingProductId: string
  toppingName: string
  toppingSku: string
  uomId: string
  uomCode: string
  defaultQtyPerItem: number
  extraPrice: number
  sortOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreateProductToppingPayload {
  toppingProductId: string
  defaultQtyPerItem: number
  extraPrice?: number
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateProductToppingPayload {
  defaultQtyPerItem?: number
  extraPrice?: number
  sortOrder?: number
  isActive?: boolean
}

export const productToppingService = {
  async list(productId: string): Promise<ProductTopping[]> {
    const response = await httpClient.get<ApiSuccess<ProductTopping[]>>(
      `/products/${productId}/toppings`,
    )
    return response.data.data
  },

  async create(
    productId: string,
    payload: CreateProductToppingPayload,
  ): Promise<ProductTopping> {
    const response = await httpClient.post<ApiSuccess<ProductTopping>>(
      `/products/${productId}/toppings`,
      payload,
    )
    return response.data.data
  },

  async update(
    productId: string,
    id: string,
    payload: UpdateProductToppingPayload,
  ): Promise<ProductTopping> {
    const response = await httpClient.put<ApiSuccess<ProductTopping>>(
      `/products/${productId}/toppings/${id}`,
      payload,
    )
    return response.data.data
  },

  async remove(productId: string, id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/products/${productId}/toppings/${id}`)
  },
}
