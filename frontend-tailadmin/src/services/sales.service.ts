/**
 * Sales / POS service — company- & outlet-scoped Point-of-Sale operations:
 * cashier shifts, the POS product grid (two sale modes), and the sales-order
 * lifecycle (checkout → pay → void/refund). Verified against the backend POS
 * contract. Base path `/sales`.
 *
 * ── Shift ────────────────────────────────────────────────────────────
 *  - POST /sales/shifts/open        → { success, data: Shift }   guard: shift.manage
 *      body: { outletId (uuid), openingCash (number>=0), notes? }
 *  - POST /sales/shifts/:id/close   → { success, data: Shift }   guard: shift.manage
 *      body: { actualCash (number>=0), notes? }
 *      (backend fills expectedCash + discrepancy; expectedCash counts CASH only)
 *  - GET  /sales/shifts             → { success, data: Shift[], meta }  guard: shift.read
 *      filters: page, limit, status?('OPEN'|'CLOSED'), outletId?, cashierUserId?
 *  - GET  /sales/shifts/:id         → { success, data: Shift }   guard: shift.read
 *
 * ── POS products & toppings (GLOBAL topping model, doc 51 Fase 6b) ─────
 *  - GET  /sales/pos/products       → { success, data: PosProduct[], meta }  guard: sales.manage
 *      filters: page, limit, outletId?, search?
 *      PosProduct carries `saleMode` ('MADE_TO_ORDER'|'STOCK') and `hasToppings`
 *      (boolean). Toppings are NO LONGER inlined per product.
 *      Stock is returned as TWO numbers so the grid can tell "kosong" from
 *      "ada tapi kedaluwarsa": `availableQty` = stock that CAN be sold
 *      (status ACTIVE, qty_available > 0, expired_date NULL or >= today) and
 *      `expiredQty` = stock that CANNOT be sold (status ACTIVE,
 *      qty_available > 0, expired_date < today). POS never backflushes
 *      ingredients on its own, so an untopped line with `availableQty === 0`
 *      is rejected by the backend — the grid disables those cards up-front.
 *  - GET  /sales/pos/toppings       → { success, data: PosToppingOption[] }  guard: sales.manage
 *      Daftar topping GLOBAL yang AKTIF — satu sumber untuk panel modifier POS,
 *      ditampilkan untuk produk MADE_TO_ORDER yang `hasToppings === true`.
 *
 * ── Sales Order ──────────────────────────────────────────────────────
 *  - POST /sales/orders             → 201 SalesOrder (PENDING_PAYMENT)  guard: sales.manage
 *      body: { outletId, shiftId (OPEN shift), customerName?, orderDiscount?(>=0),
 *              items[>=1]{ productId, qty(>0), itemDiscount?(>=0),
 *                          toppings?[{ toppingProductId }] } }
 *      Only `toppingProductId` is sent; price/qty/name are snapshotted server-side.
 *      Toppings are ONLY allowed for MADE_TO_ORDER products; sending toppings for
 *      a STOCK product → 400 TOPPING.NOT_ALLOWED. (Stock is NOT reserved at checkout.)
 *  - POST /sales/orders/:id/pay     → SalesOrder (PAID)   guard: sales.manage
 *      body: { payments[>=1]{ method('CASH'|'CARD'|'QRIS'|'BANK_TRANSFER'),
 *                             amount(>0), referenceNo? } }
 *      Σ amount MUST equal grandTotal (else 400 PAYMENT.AMOUNT_MISMATCH); FEFO
 *      stock deduction is atomic — insufficient stock → 400 INVENTORY.INSUFFICIENT_STOCK.
 *  - POST /sales/orders/:id/void    → SalesOrder (CANCELLED)   guard: sales.manage
 *      (only from PENDING_PAYMENT)
 *  - POST /sales/orders/:id/returns → SalesOrder (REFUNDED, + `salesReturn`)  guard: sales.manage
 *      body: { reason? } (only from PAID; full-order refund in the MVP)
 *  - GET  /sales/orders             → { success, data: SalesOrder[], meta }  guard: sales.read
 *      filters: page, limit, status?, outletId?, shiftId?, search?(invoiceNumber)
 *  - GET  /sales/orders/:id         → { success, data: SalesOrder }  guard: sales.read
 *      (detail carries `salesReturn`: null unless REFUNDED)
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

// ── Status / enum constants + labels (Indonesian) ─────────────────────

/** Sales order lifecycle statuses (doc 51 §6.1). */
export const SALES_ORDER_STATUSES = ['PENDING_PAYMENT', 'PAID', 'CANCELLED', 'REFUNDED'] as const
export type SalesOrderStatus = (typeof SALES_ORDER_STATUSES)[number]

export const SALES_ORDER_STATUS_LABELS: Record<SalesOrderStatus, string> = {
  PENDING_PAYMENT: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dikembalikan',
}

/** Shift lifecycle statuses (doc 51 §6.2). */
export const SHIFT_STATUSES = ['OPEN', 'CLOSED'] as const
export type ShiftStatus = (typeof SHIFT_STATUSES)[number]

export const SHIFT_STATUS_LABELS: Record<ShiftStatus, string> = {
  OPEN: 'Buka',
  CLOSED: 'Tutup',
}

/** Payment methods (doc 51 §4.6). */
export const PAYMENT_METHODS = ['CASH', 'CARD', 'QRIS', 'BANK_TRANSFER'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Tunai',
  CARD: 'Kartu',
  QRIS: 'QRIS',
  BANK_TRANSFER: 'Transfer Bank',
}

/** Per-product sale mode (doc 51 §3). */
export const SALE_MODES = ['MADE_TO_ORDER', 'STOCK'] as const
export type SaleMode = (typeof SALE_MODES)[number]

export const SALE_MODE_LABELS: Record<SaleMode, string> = {
  MADE_TO_ORDER: 'Buat Sesuai Pesanan',
  STOCK: 'Jual Stok',
}

// ── Entities ──────────────────────────────────────────────────────────

export interface Shift {
  id: string
  companyId: string | null
  outletId: string
  cashierUserId: string
  openedAt: string
  closedAt: string | null
  openingCash: number
  expectedCash: number | null
  actualCash: number | null
  discrepancy: number | null
  status: ShiftStatus
  notes: string | null
}

export interface PosToppingOption {
  toppingProductId: string
  toppingName: string
  defaultQtyPerItem: number
  extraPrice: number
  sortOrder: number
}

export interface PosProduct {
  productId: string
  sku: string
  name: string
  productType: string
  sellingPrice: number
  saleMode: SaleMode
  recipeId: string | null
  hasToppings: boolean
  /**
   * Finished-goods stock on hand at the POS outlet that CAN be sold: ACTIVE
   * batches with `qty_available > 0` and `expired_date` NULL or >= today.
   * 0 when no outlet is given, no stock exists, or all stock is expired.
   */
  availableQty: number
  /**
   * Finished-goods stock on hand at the POS outlet that CANNOT be sold: ACTIVE
   * batches with `qty_available > 0` and `expired_date` < today. Used only to
   * explain WHY a product is unsellable (expired vs. out of stock); it is never
   * sellable and never contributes to `availableQty`.
   */
  expiredQty: number
}

export interface SalesOrderItemTopping {
  id: string
  toppingProductId: string
  toppingNameSnapshot: string
  qtyPerItem: number
  extraPriceSnapshot: number
}

export interface SalesOrderItem {
  id: string
  productId: string
  saleMode: SaleMode
  recipeId: string | null
  productNameSnapshot: string
  unitPriceSnapshot: number
  qty: number
  itemDiscount: number
  toppingsPrice: number
  lineTotal: number
  toppings: SalesOrderItemTopping[]
}

export interface SalesPayment {
  id: string
  paymentMethod: PaymentMethod
  amount: number
  referenceNo: string | null
  paidAt: string
}

export interface SalesReturn {
  id: string
  salesOrderId: string
  returnNumber: string | null
  reason: string | null
  refundAmount: number
  status: string
  createdAt: string
}

export interface SalesOrder {
  id: string
  companyId: string | null
  outletId: string
  shiftId: string
  invoiceNumber: string
  customerName: string | null
  orderDate: string
  status: SalesOrderStatus
  itemCount: number
  subtotal: number
  orderDiscount: number
  tax: number
  grandTotal: number
  cashierUserId: string
  paidAt: string | null
  items: SalesOrderItem[]
  payments: SalesPayment[]
  salesReturn?: SalesReturn | null
  createdAt: string
  updatedAt: string
}

// ── Request payloads ──────────────────────────────────────────────────

export interface OpenShiftPayload {
  outletId: string
  openingCash: number
  notes?: string
}

export interface CloseShiftPayload {
  actualCash: number
  notes?: string
}

export interface CheckoutToppingInput {
  toppingProductId: string
}

export interface CheckoutItemInput {
  productId: string
  qty: number
  itemDiscount?: number
  toppings?: CheckoutToppingInput[]
}

export interface CheckoutPayload {
  outletId: string
  shiftId: string
  customerName?: string
  orderDiscount?: number
  items: CheckoutItemInput[]
}

export interface SalesPaymentInput {
  method: PaymentMethod
  amount: number
  referenceNo?: string
}

export interface PayPayload {
  payments: SalesPaymentInput[]
}

export interface RefundPayload {
  reason?: string
}

// ── List params / results ─────────────────────────────────────────────

export interface ShiftListParams {
  page: number
  limit: number
  status?: ShiftStatus
  outletId?: string
  cashierUserId?: string
}

export interface ShiftListResult {
  items: Shift[]
  meta: ListMeta
}

export interface PosProductListParams {
  page: number
  limit: number
  outletId?: string
  search?: string
}

export interface PosProductListResult {
  items: PosProduct[]
  meta: ListMeta
}

export interface SalesOrderListParams {
  page: number
  limit: number
  status?: SalesOrderStatus
  outletId?: string
  shiftId?: string
  search?: string
}

export interface SalesOrderListResult {
  items: SalesOrder[]
  meta: ListMeta
}

function toShiftQuery(params: ShiftListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.cashierUserId) {
    query.cashierUserId = params.cashierUserId
  }
  return query
}

function toPosProductQuery(params: PosProductListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

function toSalesOrderQuery(params: SalesOrderListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.shiftId) {
    query.shiftId = params.shiftId
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const salesService = {
  shifts: {
    async open(payload: OpenShiftPayload): Promise<Shift> {
      const response = await httpClient.post<ApiSuccess<Shift>>('/sales/shifts/open', payload)
      return response.data.data
    },

    async close(id: string, payload: CloseShiftPayload): Promise<Shift> {
      const response = await httpClient.post<ApiSuccess<Shift>>(
        `/sales/shifts/${id}/close`,
        payload,
      )
      return response.data.data
    },

    async list(params: ShiftListParams): Promise<ShiftListResult> {
      const response = await httpClient.get<ApiListResponse<Shift>>('/sales/shifts', {
        params: toShiftQuery(params),
      })
      return { items: response.data.data, meta: response.data.meta }
    },

    async getById(id: string): Promise<Shift> {
      const response = await httpClient.get<ApiSuccess<Shift>>(`/sales/shifts/${id}`)
      return response.data.data
    },
  },

  pos: {
    async products(params: PosProductListParams): Promise<PosProductListResult> {
      const response = await httpClient.get<ApiListResponse<PosProduct>>('/sales/pos/products', {
        params: toPosProductQuery(params),
      })
      return { items: response.data.data, meta: response.data.meta }
    },

    /** GLOBAL active topping options — the single source for the POS modifier panel. */
    async toppings(): Promise<PosToppingOption[]> {
      const response = await httpClient.get<ApiSuccess<PosToppingOption[]>>('/sales/pos/toppings')
      return response.data.data
    },
  },

  orders: {
    async checkout(payload: CheckoutPayload): Promise<SalesOrder> {
      const response = await httpClient.post<ApiSuccess<SalesOrder>>('/sales/orders', payload)
      return response.data.data
    },

    async pay(id: string, payload: PayPayload): Promise<SalesOrder> {
      const response = await httpClient.post<ApiSuccess<SalesOrder>>(
        `/sales/orders/${id}/pay`,
        payload,
      )
      return response.data.data
    },

    async void(id: string): Promise<SalesOrder> {
      const response = await httpClient.post<ApiSuccess<SalesOrder>>(`/sales/orders/${id}/void`)
      return response.data.data
    },

    async refund(id: string, payload: RefundPayload): Promise<SalesOrder> {
      const response = await httpClient.post<ApiSuccess<SalesOrder>>(
        `/sales/orders/${id}/returns`,
        payload,
      )
      return response.data.data
    },

    async list(params: SalesOrderListParams): Promise<SalesOrderListResult> {
      const response = await httpClient.get<ApiListResponse<SalesOrder>>('/sales/orders', {
        params: toSalesOrderQuery(params),
      })
      return { items: response.data.data, meta: response.data.meta }
    },

    async getById(id: string): Promise<SalesOrder> {
      const response = await httpClient.get<ApiSuccess<SalesOrder>>(`/sales/orders/${id}`)
      return response.data.data
    },
  },
}

/** Badge color mapping for a sales order status (ui/Badge `color` palette). */
export function salesOrderStatusBadgeColor(
  status: SalesOrderStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'PAID':
      return 'success'
    case 'PENDING_PAYMENT':
      return 'warning'
    case 'REFUNDED':
      return 'info'
    case 'CANCELLED':
      return 'error'
    default:
      return 'light'
  }
}

/** Badge color mapping for a shift status. */
export function shiftStatusBadgeColor(status: ShiftStatus): 'success' | 'light' {
  return status === 'OPEN' ? 'success' : 'light'
}

/** Badge color mapping for a per-product sale mode. */
export function saleModeBadgeColor(mode: SaleMode): 'info' | 'primary' {
  return mode === 'MADE_TO_ORDER' ? 'primary' : 'info'
}
