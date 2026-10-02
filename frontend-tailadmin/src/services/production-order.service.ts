/**
 * Production Order service — company-scoped documents that convert raw
 * materials into finished goods through a recipe (BOM). Verified against the
 * backend contract (production-order.controller.ts + create-production-order.dto.ts
 * + ProductionOrder entity / ProductionOrderRepositoryPostgres) on the
 * feature/production branch.
 *
 * Production is INSTANT-COMPLETE: creating a production order runs the whole
 * production (backflush ingredients FEFO + produce the finished-goods batch,
 * atomic) and lands the order on COMPLETED. There are NO start/yield/qa/
 * complete/cancel actions, and COMPLETED is the only practical status.
 *
 * Base path: /production/orders
 *  - GET    /production/orders            → { success, data: ProductionOrder[], meta }
 *      guard: production-order.read
 *      filters: page, limit, outletId? (uuid), productId? (uuid),
 *               status? (COMPLETED), search? (productionNumber)
 *      NOTE: the LIST returns HEADERS ONLY — `materials` and `results` are
 *      always empty arrays on list rows (the repository loads them per detail).
 *  - GET    /production/orders/:id        → { success, data: ProductionOrder }
 *      (header + materials[] + results[]).
 *  - POST   /production/orders            → 201 COMPLETED
 *      guard: production-order.manage
 *      body: see CreateProductionOrderPayload. The UI sends `productId` (the
 *      finished product); the backend resolves its ACTIVE recipe (404
 *      RECIPE.NO_ACTIVE_RECIPE when none). May return 400
 *      INVENTORY.INSUFFICIENT_STOCK when ingredient stock is short — surface
 *      the message and keep the user on the page.
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

/** Production Order status. Instant-complete → only COMPLETED is produced. */
export const PRODUCTION_ORDER_STATUSES = ['COMPLETED'] as const
export type ProductionOrderStatus = (typeof PRODUCTION_ORDER_STATUSES)[number]

export const PRODUCTION_ORDER_STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  COMPLETED: 'Selesai',
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
  notes: string | null
  resultBatchId: string | null
  /** Consumed ingredients (populated on detail; empty on list rows). */
  materials: ProductionMaterial[]
  /** Produced finished-goods batches (populated on detail; empty on list rows). */
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
 * Instant-complete production payload. The UI sends `productId` (the user picks
 * the finished product; the backend resolves its ACTIVE recipe).
 *  - scheduledQty : production target (planned finished-goods qty), > 0
 *  - actualQty    : finished goods that succeeded and enter stock, >= 0
 *  - wasteQty     : quantity that failed/was scrapped, >= 0 (default 0)
 *  - resultExpiredDate : 'YYYY-MM-DD' expiry of the finished-goods batch,
 *                        required when actualQty > 0
 *  - productionDate    : 'YYYY-MM-DD' (default today)
 *  - notes             : free text (e.g. reason for waste)
 */
export interface CreateProductionOrderPayload {
  outletId: string
  productId: string
  scheduledQty: number
  actualQty: number
  wasteQty?: number
  resultExpiredDate?: string
  productionDate?: string
  notes?: string
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

  // Run a production (instant-complete). The UI submits productId.
  async create(
    payload: CreateProductionOrderPayload,
  ): Promise<ProductionOrder> {
    const response = await httpClient.post<ApiSuccess<ProductionOrder>>(
      '/production/orders',
      payload,
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  _status: ProductionOrderStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  // Only COMPLETED exists in the instant-complete model.
  return 'success'
}
