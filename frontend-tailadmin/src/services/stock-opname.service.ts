/**
 * Stock Opname service — company-scoped physical stock-counting documents with
 * a full lifecycle. Verified against the backend contract
 * (stock-count.controller.ts + DTOs + StockOpname / StockOpnameItem entities).
 *
 * Base path: `/inventory/stock-counts`. Success: { success, data }; list:
 * { success, data: [], meta: { page, limit, total, totalPages } }.
 *
 *  - GET    /inventory/stock-counts            → { success, data: StockOpname[], meta }
 *      guard: inventory.stock-count.read
 *      filters: page, limit, outletId?, status?, search? (opnameNumber/notes)
 *      NOTE: each list row CARRIES its `items[]` array (header + items).
 *  - GET    /inventory/stock-counts/:id        → { success, data: StockOpname } (header + items)
 *      guard: inventory.stock-count.read
 *  - POST   /inventory/stock-counts            → 201 DRAFT
 *      guard: inventory.stock-count.create
 *      body: { outletId (UUID, required), opnameDate? 'YYYY-MM-DD' (default today),
 *              notes? }  — NO items in the body (snapshotted on `start`).
 *  - POST   /inventory/stock-counts/:id/start  → DRAFT → COUNTING             guard: .create
 *      NO body. Backend snapshots all ACTIVE batches of the outlet into items
 *      (systemQty frozen) and locks the outlet. May fail 400 if the outlet is
 *      already locked by another opname (STOCK_OPNAME.OUTLET_LOCKED) or on an
 *      invalid transition.
 *  - PUT    /inventory/stock-counts/:id/items/:itemId/count → record a count   guard: .update
 *      body: { countedQty (number, >= 0) }. COUNTING only. Backend computes
 *      differenceQty = countedQty - systemQty. Response = the FULL StockOpname.
 *  - POST   /inventory/stock-counts/:id/submit   → COUNTING → SUBMITTED        guard: .update
 *  - POST   /inventory/stock-counts/:id/approve  → SUBMITTED → APPROVED        guard: .approve
 *  - POST   /inventory/stock-counts/:id/complete → APPROVED → COMPLETED        guard: .complete
 *      NO body. Backend auto-generates ONE reconciliation Stock Adjustment for
 *      every non-zero difference, then posts stock. The response carries a
 *      populated `generatedAdjustmentId` when any variance existed.
 *  - POST   /inventory/stock-counts/:id/cancel   → → CANCELLED                 guard: .update
 *      NO body. Only from DRAFT | COUNTING | SUBMITTED (APPROVED & COMPLETED
 *      cannot be cancelled).
 *
 * Lifecycle: DRAFT → COUNTING → SUBMITTED → APPROVED → COMPLETED, plus
 *            DRAFT | COUNTING | SUBMITTED → CANCELLED.
 *
 * CONTRACT NOTES (verified, mirrored by the UI):
 *  - Lifecycle actions (start/submit/approve/complete/cancel) take NO request
 *    body — only the route id. The record-count endpoint is the sole mutation
 *    with a body ({ countedQty }).
 *  - Items are SPARSE: each item has ids only (batchId/productId) plus the
 *    quantities — NO product name / SKU / batch number. The view resolves names
 *    via one-time lookups (productService.list, inventoryService.getBatches,
 *    outletService.list) just like StockAdjustmentDetail.
 *  - `countedQty` / `differenceQty` are null until a count is recorded.
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

/** Lifecycle statuses (doc 35 §1 subset used by Stock Opname). */
export const OPNAME_STATUSES = [
  'DRAFT',
  'COUNTING',
  'SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'CANCELLED',
] as const
export type StockOpnameStatus = (typeof OPNAME_STATUSES)[number]

export const OPNAME_STATUS_LABELS: Record<StockOpnameStatus, string> = {
  DRAFT: 'Draft',
  COUNTING: 'Penghitungan',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export interface StockOpnameItem {
  id: string
  batchId: string
  productId: string
  systemQty: number
  /** Null until a count is recorded for the item. */
  countedQty: number | null
  /** countedQty - systemQty, filled alongside countedQty. */
  differenceQty: number | null
}

export interface StockOpname {
  id: string
  companyId: string | null
  outletId: string
  opnameNumber: string
  opnameDate: string
  status: StockOpnameStatus
  notes: string | null
  /** Populated after COMPLETED when variance generated a reconciliation adjustment. */
  generatedAdjustmentId: string | null
  items: StockOpnameItem[]
  createdAt: string
  updatedAt: string
}

export interface StockOpnameListParams {
  page: number
  limit: number
  outletId?: string
  status?: StockOpnameStatus
  search?: string
}

export interface StockOpnameListResult {
  items: StockOpname[]
  meta: ListMeta
}

/** Create payload — header only (no items). */
export interface CreateStockOpnamePayload {
  outletId: string
  opnameDate?: string
  notes?: string
}

function toQuery(
  params: StockOpnameListParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const stockOpnameService = {
  async list(params: StockOpnameListParams): Promise<StockOpnameListResult> {
    const response = await httpClient.get<ApiListResponse<StockOpname>>(
      '/inventory/stock-counts',
      { params: toQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<StockOpname> {
    const response = await httpClient.get<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}`,
    )
    return response.data.data
  },

  async create(payload: CreateStockOpnamePayload): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      '/inventory/stock-counts',
      payload,
    )
    return response.data.data
  },

  // DRAFT → COUNTING. Snapshots the outlet's batches into items; no body.
  async start(id: string): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/start`,
    )
    return response.data.data
  },

  // Record a physical count for one item (COUNTING only). Returns full opname.
  async recordCount(
    id: string,
    itemId: string,
    countedQty: number,
  ): Promise<StockOpname> {
    const response = await httpClient.put<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/items/${itemId}/count`,
      { countedQty },
    )
    return response.data.data
  },

  // Lifecycle actions take no request body (backend-verified).
  async submit(id: string): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/submit`,
    )
    return response.data.data
  },

  async approve(id: string): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/approve`,
    )
    return response.data.data
  },

  async complete(id: string): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/complete`,
    )
    return response.data.data
  },

  async cancel(id: string): Promise<StockOpname> {
    const response = await httpClient.post<ApiSuccess<StockOpname>>(
      `/inventory/stock-counts/${id}/cancel`,
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: StockOpnameStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'COUNTING':
      return 'info'
    case 'SUBMITTED':
      return 'info'
    case 'APPROVED':
      return 'warning'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    case 'DRAFT':
    default:
      return 'light'
  }
}

/**
 * Badge color for an item's difference quantity: positive (surplus) → success,
 * negative (shortage) → error, zero / not-yet-counted → light.
 */
export function differenceBadgeColor(
  difference: number | null,
): 'success' | 'error' | 'light' {
  if (difference === null || difference === 0) {
    return 'light'
  }
  return difference > 0 ? 'success' : 'error'
}
