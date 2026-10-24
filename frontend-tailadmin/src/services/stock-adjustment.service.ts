/**
 * Stock Adjustment service — company-scoped inventory correction documents
 * with a full lifecycle. Verified against the backend contract
 * (stock-adjustment.controller.ts + DTOs + StockAdjustment entity /
 * StockAdjustmentRepositoryPostgres).
 *
 *  - GET    /inventory/adjustments            → { success, data: StockAdjustment[], meta }
 *      guard: inventory.adjustment.read
 *      filters: page, limit, outletId?, status?, search? (adjustmentNumber/notes)
 *      NOTE: the list DOES return each row with its `items` array (the backend
 *      loads items per header), so the list shares the full entity shape.
 *  - GET    /inventory/adjustments/:id        → { success, data: StockAdjustment } (header + items)
 *  - POST   /inventory/adjustments            → 201 DRAFT
 *      guard: inventory.adjustment.create
 *      body: { outletId, adjustmentDate? 'YYYY-MM-DD', notes?,
 *              items[>=1]{ batchId, productId, direction 'IN'|'OUT', qty>0,
 *                          reason, reasonDescription? } }
 *  - PUT    /inventory/adjustments/:id        → update (DRAFT only; same body)
 *      guard: inventory.adjustment.update
 *  - POST   /inventory/adjustments/:id/submit   → DRAFT → SUBMITTED      guard: .update
 *  - POST   /inventory/adjustments/:id/approve  → SUBMITTED → APPROVED   guard: .approve
 *  - POST   /inventory/adjustments/:id/cancel   → DRAFT|SUBMITTED → CANCELLED guard: .update
 *  - POST   /inventory/adjustments/:id/complete → APPROVED → COMPLETED (posts stock) guard: .complete
 *
 * CONTRACT NOTES (verified, mirrored by the UI):
 *  - The lifecycle actions (submit/approve/cancel/complete) take NO request
 *    body — the controller methods accept only the route id. The UI must NOT
 *    send a note for any action.
 *  - The entity exposes NO status-log collection (status audit columns exist in
 *    the DB but are not projected), so the detail view renders no timeline.
 *  - `beforeQty` / `afterQty` on an item are null until the adjustment is
 *    COMPLETED (filled by the posting transaction).
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

/** Lifecycle statuses (doc 35 §1 subset used by Stock Adjustment). */
export const STOCK_ADJUSTMENT_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'COMPLETED',
  'CANCELLED',
] as const
export type StockAdjustmentStatus = (typeof STOCK_ADJUSTMENT_STATUSES)[number]

export const STOCK_ADJUSTMENT_STATUS_LABELS: Record<StockAdjustmentStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

/** Adjustment direction: IN increases stock, OUT decreases it. */
export const ADJUSTMENT_DIRECTIONS = ['IN', 'OUT'] as const
export type AdjustmentDirection = (typeof ADJUSTMENT_DIRECTIONS)[number]

export const ADJUSTMENT_DIRECTION_LABELS: Record<AdjustmentDirection, string> = {
  IN: 'Masuk (+)',
  OUT: 'Keluar (-)',
}

/** Mandatory reason codes for every adjustment line. */
export const ADJUSTMENT_REASONS = [
  'STOCK_COUNT',
  'DAMAGED',
  'EXPIRED',
  'LOST',
  'FOUND',
  'CORRECTION',
  'OTHER',
] as const
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number]

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  STOCK_COUNT: 'Hasil Stock Count',
  DAMAGED: 'Rusak',
  EXPIRED: 'Kedaluwarsa',
  LOST: 'Hilang',
  FOUND: 'Ditemukan',
  CORRECTION: 'Koreksi',
  OTHER: 'Lainnya',
}

/** Human label for a reason code; falls back to the raw code if unknown. */
export function adjustmentReasonLabel(reason: string): string {
  return ADJUSTMENT_REASON_LABELS[reason as AdjustmentReason] ?? reason
}

/** Human label for a direction; falls back to the raw code if unknown. */
export function adjustmentDirectionLabel(direction: string): string {
  return ADJUSTMENT_DIRECTION_LABELS[direction as AdjustmentDirection] ?? direction
}

export interface StockAdjustmentItem {
  id: string
  batchId: string
  productId: string
  direction: AdjustmentDirection
  qty: number
  reason: AdjustmentReason
  reasonDescription: string | null
  /** Filled only after COMPLETED (posting snapshot); null before. */
  beforeQty: number | null
  afterQty: number | null
}

export interface StockAdjustment {
  id: string
  companyId: string | null
  outletId: string
  adjustmentNumber: string
  adjustmentDate: string
  status: StockAdjustmentStatus
  notes: string | null
  items: StockAdjustmentItem[]
  createdAt: string
  updatedAt: string
}

export interface StockAdjustmentListParams {
  page: number
  limit: number
  outletId?: string
  status?: StockAdjustmentStatus
  search?: string
}

export interface StockAdjustmentListResult {
  items: StockAdjustment[]
  meta: ListMeta
}

/** A single line item in the create/update payload. */
export interface StockAdjustmentItemPayload {
  batchId: string
  productId: string
  direction: AdjustmentDirection
  qty: number
  reason: AdjustmentReason
  reasonDescription?: string
}

export interface SaveStockAdjustmentPayload {
  outletId: string
  adjustmentDate?: string
  notes?: string
  items: StockAdjustmentItemPayload[]
}

function toQuery(params: StockAdjustmentListParams): Record<string, string | number> {
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

export const stockAdjustmentService = {
  async list(params: StockAdjustmentListParams): Promise<StockAdjustmentListResult> {
    const response = await httpClient.get<ApiListResponse<StockAdjustment>>(
      '/inventory/adjustments',
      { params: toQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<StockAdjustment> {
    const response = await httpClient.get<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}`,
    )
    return response.data.data
  },

  async create(payload: SaveStockAdjustmentPayload): Promise<StockAdjustment> {
    const response = await httpClient.post<ApiSuccess<StockAdjustment>>(
      '/inventory/adjustments',
      payload,
    )
    return response.data.data
  },

  async update(id: string, payload: SaveStockAdjustmentPayload): Promise<StockAdjustment> {
    const response = await httpClient.put<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}`,
      payload,
    )
    return response.data.data
  },

  // Lifecycle actions take no request body (backend-verified).
  async submit(id: string): Promise<StockAdjustment> {
    const response = await httpClient.post<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}/submit`,
    )
    return response.data.data
  },

  async approve(id: string): Promise<StockAdjustment> {
    const response = await httpClient.post<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}/approve`,
    )
    return response.data.data
  },

  async cancel(id: string): Promise<StockAdjustment> {
    const response = await httpClient.post<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}/cancel`,
    )
    return response.data.data
  },

  async complete(id: string): Promise<StockAdjustment> {
    const response = await httpClient.post<ApiSuccess<StockAdjustment>>(
      `/inventory/adjustments/${id}/complete`,
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: StockAdjustmentStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
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

/** Badge color per direction (IN success/green, OUT warning/orange). */
export function directionBadgeColor(direction: AdjustmentDirection): 'success' | 'warning' {
  return direction === 'IN' ? 'success' : 'warning'
}
