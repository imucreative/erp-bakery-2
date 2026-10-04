/**
 * Topping service — tenant-scoped CRUD for the GLOBAL topping catalog
 * (POS made-to-order modifier model, doc 51 §2.1/§5.0/§10.1/§11.1 Fase 6b).
 *
 * Model (GLOBAL): a topping is a company-wide modifier that points to a
 * sellable material product (`toppingProductId`, bertipe RAW_MATERIAL /
 * SEMI_FINISHED). Each topping carries a per-item takaran (`defaultQtyPerItem`
 * dalam satuan dasar topping) dan harga tambahan (`extraPrice`) yang dibebankan
 * ke pelanggan saat dipilih. Topping tidak lagi menempel per-produk; produk
 * hanya menandai `hasToppings` untuk memunculkan panel modifier di POS.
 *
 * Verified against the backend GLOBAL topping contract (base /api/v1):
 *   - GET    /toppings          (guard product.read)   → { success, data: Topping[] }
 *   - POST   /toppings          (guard product.manage)
 *       body: { toppingProductId (uuid), defaultQtyPerItem (number>0),
 *               extraPrice (number>=0, default 0), sortOrder? (int), isActive? (bool) }
 *       → 201 { success, data: Topping }
 *   - PUT    /toppings/:id      (guard product.manage)
 *       body: { defaultQtyPerItem?, extraPrice?, sortOrder?, isActive? }
 *       → 200 { success, data: Topping }
 *   - DELETE /toppings/:id      (guard product.manage) → 200 { success, data: null }
 *   errors: 400 TOPPING.INVALID_PRODUCT_TYPE (topping harus RAW_MATERIAL /
 *           SEMI_FINISHED), 409 TOPPING.DUPLICATE, 404 TOPPING.NOT_FOUND
 *
 * POS modifier source (global, active-only):
 *   - GET /sales/pos/toppings   (guard sales.manage)   → { success, data: PosToppingOption[] }
 *     (lihat `salesService.pos.toppings()` di sales.service.ts untuk layar POS)
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface Topping {
  id: string
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
}

export interface CreateToppingPayload {
  toppingProductId: string
  defaultQtyPerItem: number
  extraPrice?: number
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateToppingPayload {
  defaultQtyPerItem?: number
  extraPrice?: number
  sortOrder?: number
  isActive?: boolean
}

export const toppingService = {
  async list(): Promise<Topping[]> {
    const response = await httpClient.get<ApiSuccess<Topping[]>>('/toppings')
    return response.data.data
  },

  async create(payload: CreateToppingPayload): Promise<Topping> {
    const response = await httpClient.post<ApiSuccess<Topping>>('/toppings', payload)
    return response.data.data
  },

  async update(id: string, payload: UpdateToppingPayload): Promise<Topping> {
    const response = await httpClient.put<ApiSuccess<Topping>>(`/toppings/${id}`, payload)
    return response.data.data
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete<ApiSuccess<null>>(`/toppings/${id}`)
  },
}
