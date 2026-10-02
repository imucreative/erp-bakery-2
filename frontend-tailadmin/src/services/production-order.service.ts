/**
 * Production Order service — company-scoped documents that convert raw
 * materials into finished goods through a recipe (BOM), with a multi-step
 * lifecycle and a QA gate. Verified against the backend contract
 * (production-order.controller.ts + DTOs + ProductionOrder entity /
 * ProductionOrderRepositoryPostgres).
 *
 * Base path: /production/orders
 *  - GET    /production/orders            → { success, data: ProductionOrder[], meta }
 *      guard: production-order.read
 *      filters: page, limit, outletId? (uuid), productId? (uuid),
 *               status? (SCHEDULED|IN_PROGRESS|YIELD_COMPLETED|QA_PASSED|
 *                        QA_FAILED|COMPLETED|CANCELLED), search? (productionNumber)
 *      NOTE: the LIST returns HEADERS ONLY — `materials` and `results` are
 *      always empty arrays on list rows (the repository loads them per detail).
 *      The list table must therefore NOT rely on materials/results counts.
 *  - GET    /production/orders/:id        → { success, data: ProductionOrder }
 *      (header + materials[] + results[] — the latter two populated only after
 *      COMPLETED).
 *  - POST   /production/orders            → 201 SCHEDULED
 *      guard: production-order.manage
 *      body: { outletId (uuid), recipeId? (uuid) | productId? (uuid) — recipe
 *              wins; providing only productId makes the backend resolve the
 *              product's ACTIVE recipe (rejects when none exists),
 *              scheduledQty>0, productionDate? 'YYYY-MM-DD', notes? }
 *  - POST   /production/orders/:id/start    → SCHEDULED → IN_PROGRESS (no body)
 *  - POST   /production/orders/:id/yield    → IN_PROGRESS → YIELD_COMPLETED
 *      body: { actualQty>0, wasteQty?>=0 (default 0),
 *              resultExpiredDate 'YYYY-MM-DD', notes? }
 *  - POST   /production/orders/:id/qa       → YIELD_COMPLETED → QA_PASSED|QA_FAILED
 *      body: { passed (boolean), qaNotes? }
 *  - POST   /production/orders/:id/complete → QA_PASSED|QA_FAILED → COMPLETED
 *      (backflushing: consume ingredients FEFO + create a finished-goods batch
 *      when QA_PASSED; when QA_FAILED consume ingredients but scrap the output).
 *      May return 400 when ingredient stock is insufficient — surface the
 *      message. (no body)
 *  - POST   /production/orders/:id/cancel   → SCHEDULED → CANCELLED
 *      body: { reason? }
 *
 * CONTRACT NOTES (verified, mirrored by the UI):
 *  - canTransition: SCHEDULED → (IN_PROGRESS | CANCELLED); IN_PROGRESS →
 *    YIELD_COMPLETED; YIELD_COMPLETED → (QA_PASSED | QA_FAILED); QA_PASSED →
 *    COMPLETED; QA_FAILED → COMPLETED; COMPLETED & CANCELLED are terminal.
 *  - The entity exposes NO status-log collection, so the detail view renders no
 *    timeline.
 *  - `actualQty` / `resultExpiredDate` are null until a yield is recorded;
 *    `materials` / `results` are empty until the order is COMPLETED.
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

/** Production Order lifecycle statuses (production-domain §5). */
export const PRODUCTION_ORDER_STATUSES = [
  'SCHEDULED',
  'IN_PROGRESS',
  'YIELD_COMPLETED',
  'QA_PASSED',
  'QA_FAILED',
  'COMPLETED',
  'CANCELLED',
] as const
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number]

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  SCHEDULED: 'Terjadwal',
  IN_PROGRESS: 'Diproses',
  YIELD_COMPLETED: 'Hasil Dicatat',
  QA_PASSED: 'QA Lulus',
  QA_FAILED: 'QA Gagal',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

/** A single ingredient consumed (backflushed) by a completed production order. */
export interface ProductionMaterial {
  id: string
  recipeItemId: string | null
  productId: string
  batchId: string
  plannedQty: number
  qtyConsumed: number
}

/** A finished-goods batch produced by a completed production order. */
export interface ProductionResult {
  id: string
  productId: string
  batchId: string
  batchNumber: string
  expiredDate: string
  qtyProduced: number
}

export interface ProductionOrder {
  id: string
  companyId: string | null
  outletId: string
  productionNumber: string
  recipeId: string
  productId: string
  scaleFactor: number
  scheduledQty: number
  actualQty: number | null
  wasteQty: number
  productionDate: string
  resultExpiredDate: string | null
  status: ProductionOrderStatus
  qaNotes: string | null
  notes: string | null
  resultBatchId: string | null
  /** Populated only after COMPLETED (empty on list rows and pre-completion). */
  materials: ProductionMaterial[]
  /** Populated only after a QA_PASSED completion (empty otherwise). */
  results: ProductionResult[]
  createdAt: string
  updatedAt: string
}

export interface ProductionOrderListParams {
  page: number
  limit: number
  outletId?: string
  productId?: string
  status?: ProductionOrderStatus
  search?: string
}

export interface ProductionOrderListResult {
  items: ProductionOrder[]
  meta: ListMeta
}

/**
 * Schedule payload. The UI sends `productId` (user picks the finished product;
 * the backend resolves its ACTIVE recipe). `recipeId` is kept in the type for
 * completeness, but the schedule form submits productId only.
 */
export interface ScheduleProductionOrderPayload {
  outletId: string
  productId?: string
  recipeId?: string
  scheduledQty: number
  productionDate?: string
  notes?: string
}

/** Record-yield payload (IN_PROGRESS → YIELD_COMPLETED). */
export interface RecordYieldPayload {
  actualQty: number
  wasteQty?: number
  resultExpiredDate: string
  notes?: string
}

/** QA check payload (YIELD_COMPLETED → QA_PASSED | QA_FAILED). */
export interface QaCheckPayload {
  passed: boolean
  qaNotes?: string
}

function toQuery(
  params: ProductionOrderListParams,
): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.productId) {
    query.productId = params.productId
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const productionOrderService = {
  async list(
    params: ProductionOrderListParams,
  ): Promise<ProductionOrderListResult> {
    const response = await httpClient.get<ApiListResponse<ProductionOrder>>(
      '/production/orders',
      { params: toQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<ProductionOrder> {
    const response = await httpClient.get<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}`,
    )
    return response.data.data
  },

  // Schedule a new production order (SCHEDULED). The UI submits productId.
  async create(
    payload: ScheduleProductionOrderPayload,
  ): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      '/production/orders',
      payload,
    )
    return response.data.data
  },

  // SCHEDULED → IN_PROGRESS (no body).
  async start(id: string): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}/start`,
    )
    return response.data.data
  },

  // IN_PROGRESS → YIELD_COMPLETED.
  async recordYield(
    id: string,
    payload: RecordYieldPayload,
  ): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}/yield`,
      payload,
    )
    return response.data.data
  },

  // YIELD_COMPLETED → QA_PASSED | QA_FAILED.
  async qaCheck(id: string, payload: QaCheckPayload): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}/qa`,
      payload,
    )
    return response.data.data
  },

  // QA_PASSED|QA_FAILED → COMPLETED (backflushing; may 400 on insufficient stock).
  async complete(id: string): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}/complete`,
    )
    return response.data.data
  },

  // SCHEDULED → CANCELLED (optional reason).
  async cancel(id: string, reason?: string): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      `/production/orders/${id}/cancel`,
      reason ? { reason } : {},
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: ProductionOrderStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'IN_PROGRESS':
      return 'info'
    case 'YIELD_COMPLETED':
      return 'warning'
    case 'QA_PASSED':
      return 'info'
    case 'QA_FAILED':
      return 'error'
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    case 'SCHEDULED':
    default:
      return 'light'
  }
}
