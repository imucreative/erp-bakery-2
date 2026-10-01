/**
 * Goods Receipt service — company-scoped document CRUD + lifecycle actions.
 * Verified against the final GR backend contract (Tahap 1 + 2).
 *
 *  - GET    /goods-receipts            → { success, data: GoodsReceipt[], meta } (paginated)
 *      filters: page, limit, status?, purchaseOrderId?, supplierId?,
 *               destinationOutletId?, search? (grNumber)
 *  - GET    /goods-receipts/:id        → { success, data: GoodsReceipt } (+ items + statusLogs)
 *  - GET    /goods-receipts/outstanding?purchaseOrderId=<uuid>[&excludeGoodsReceiptId=<uuid>]
 *      → { purchaseOrderId, items: GoodsReceiptOutstandingItem[] }
 *      outstanding per PO item = orderedQuantity − receivedQuantity (clamped ≥ 0);
 *      fully-received items are omitted. In edit mode the GR being edited is
 *      excluded so its own receipt is added back (available again for this GR).
 *  - POST   /goods-receipts            → 201 DRAFT
 *      body: { purchaseOrderId (required, PO must be APPROVED),
 *              receiveDate "YYYY-MM-DD" (required), notes?,
 *              items?[{ purchaseOrderItemId, productId, acceptedQuantity>=0,
 *                       rejectedQuantity>=0, uomId, batchNumber?, lotNumber?,
 *                       expiryDate? }] }
 *      When items are omitted the backend prefills them from the outstanding set.
 *  - PUT    /goods-receipts/:id        → update (DRAFT only; same body)
 *  - POST   /goods-receipts/:id/complete → DRAFT → COMPLETED (posts inventory,
 *      idempotent). After COMPLETED the GR is terminal/read-only.  body { note? }
 *  - POST   /goods-receipts/:id/cancel   → DRAFT → CANCELLED. COMPLETED cannot be
 *      cancelled.  body { note? }
 *
 * Item validation (backend-authoritative, mirrored in the UI): for each included
 * item `acceptedQuantity + rejectedQuantity ≤ outstandingQuantity`, and at least
 * one of the two must be > 0. For a batch-tracked product with
 * `acceptedQuantity > 0`, `batchNumber` + `expiryDate` are required.
 *
 * `inventoryPostedAt` is server-authoritative (set when the GR completes) and is
 * never part of a create/update payload.
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

export const GOODS_RECEIPT_STATUSES = ['DRAFT', 'COMPLETED', 'CANCELLED'] as const
export type GoodsReceiptStatus = (typeof GOODS_RECEIPT_STATUSES)[number]

export const GOODS_RECEIPT_STATUS_LABELS: Record<GoodsReceiptStatus, string> = {
  DRAFT: 'Draft',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export interface GoodsReceiptItem {
  id: string
  purchaseOrderItemId: string
  productId: string
  orderedQuantity: number
  acceptedQuantity: number
  rejectedQuantity: number
  uomId: string
  batchNumber: string | null
  lotNumber: string | null
  expiryDate: string | null
}

export interface GoodsReceiptStatusLog {
  id: string
  fromStatus: GoodsReceiptStatus | null
  toStatus: GoodsReceiptStatus
  actorId: string | null
  actorName: string | null
  note: string | null
  createdAt: string
}

/**
 * Comment categories. INTERNAL/APPROVAL/EXTERNAL are user-selectable and sent to
 * the backend; SYSTEM is display-only (backend-authored) and never submitted.
 */
export const GOODS_RECEIPT_COMMENT_CATEGORIES = [
  'INTERNAL',
  'APPROVAL',
  'EXTERNAL',
] as const
export type GoodsReceiptCommentCategory =
  (typeof GOODS_RECEIPT_COMMENT_CATEGORIES)[number]

/** Full set including SYSTEM, used only for rendering existing comments. */
export type GoodsReceiptCommentCategoryDisplay =
  | GoodsReceiptCommentCategory
  | 'SYSTEM'

export const GOODS_RECEIPT_COMMENT_CATEGORY_LABELS: Record<
  GoodsReceiptCommentCategoryDisplay,
  string
> = {
  INTERNAL: 'Internal',
  APPROVAL: 'Persetujuan',
  EXTERNAL: 'Eksternal',
  SYSTEM: 'Sistem',
}

export interface GoodsReceiptComment {
  id: string
  category: GoodsReceiptCommentCategoryDisplay
  body: string
  authorId: string
  authorName: string | null
  createdAt: string
}

export interface AddGoodsReceiptCommentPayload {
  body: string
  category?: GoodsReceiptCommentCategory
}

export interface GoodsReceipt {
  id: string
  companyId: string | null
  grNumber: string
  purchaseOrderId: string
  supplierId: string
  destinationOutletId: string
  receiveDate: string
  status: GoodsReceiptStatus
  inventoryPostedAt: string | null
  notes: string | null
  items: GoodsReceiptItem[]
  statusLogs: GoodsReceiptStatusLog[]
  createdAt: string
  updatedAt: string
}

export interface GoodsReceiptListParams {
  page: number
  limit: number
  status?: GoodsReceiptStatus
  purchaseOrderId?: string
  supplierId?: string
  destinationOutletId?: string
  search?: string
}

export interface GoodsReceiptListResult {
  items: GoodsReceipt[]
  meta: ListMeta
}

/** A single line item in the create/update payload. */
export interface GoodsReceiptItemPayload {
  purchaseOrderItemId: string
  productId: string
  acceptedQuantity: number
  rejectedQuantity: number
  uomId: string
  batchNumber?: string
  lotNumber?: string
  expiryDate?: string
}

/**
 * A single source-PO item with its cross-GR outstanding (remaining) quota.
 * Returned by `GET /goods-receipts/outstanding`. The backend enforces that an
 * item's accepted + rejected quantity may not exceed `outstandingQuantity`:
 *   outstandingQuantity = orderedQuantity − receivedQuantity   (clamped ≥ 0)
 * In edit mode the backend excludes the GR being edited, so its own received
 * quantity is added back (available again for this GR).
 */
export interface GoodsReceiptOutstandingItem {
  purchaseOrderItemId: string
  productId: string
  orderedQuantity: number
  receivedQuantity: number
  outstandingQuantity: number
  uomId: string
}

export interface SaveGoodsReceiptPayload {
  purchaseOrderId: string
  receiveDate: string
  notes?: string
  items?: GoodsReceiptItemPayload[]
}

export interface CompleteGoodsReceiptPayload {
  note?: string
}

export interface CancelGoodsReceiptPayload {
  note?: string
}

function toQuery(params: GoodsReceiptListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.purchaseOrderId) {
    query.purchaseOrderId = params.purchaseOrderId
  }
  if (params.supplierId) {
    query.supplierId = params.supplierId
  }
  if (params.destinationOutletId) {
    query.destinationOutletId = params.destinationOutletId
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const goodsReceiptService = {
  async list(params: GoodsReceiptListParams): Promise<GoodsReceiptListResult> {
    const response = await httpClient.get<ApiListResponse<GoodsReceipt>>('/goods-receipts', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<GoodsReceipt> {
    const response = await httpClient.get<ApiSuccess<GoodsReceipt>>(`/goods-receipts/${id}`)
    return response.data.data
  },

  /**
   * Outstanding (remaining) PO-item quota across GRs for a source PO. Used by
   * the GR form editor to constrain items to what is still unreceived.
   *
   *   GET /goods-receipts/outstanding?purchaseOrderId=<uuid>
   *       [&excludeGoodsReceiptId=<uuid>]
   *
   * `excludeGoodsReceiptId` is sent in edit mode (the GR being edited) so its
   * own receipt is not counted against the quota. Each item's
   * `outstandingQuantity` is already clamped ≥ 0 by the backend. A 404 is
   * returned when the PO does not exist.
   */
  async getOutstanding(
    purchaseOrderId: string,
    excludeGoodsReceiptId?: string,
  ): Promise<GoodsReceiptOutstandingItem[]> {
    const params: Record<string, string> = { purchaseOrderId }
    if (excludeGoodsReceiptId) {
      params.excludeGoodsReceiptId = excludeGoodsReceiptId
    }
    const response = await httpClient.get<
      ApiSuccess<{ purchaseOrderId: string; items: GoodsReceiptOutstandingItem[] }>
    >('/goods-receipts/outstanding', { params })
    return response.data.data.items
  },

  async create(payload: SaveGoodsReceiptPayload): Promise<GoodsReceipt> {
    const response = await httpClient.post<ApiSuccess<GoodsReceipt>>('/goods-receipts', payload)
    return response.data.data
  },

  async update(id: string, payload: SaveGoodsReceiptPayload): Promise<GoodsReceipt> {
    const response = await httpClient.put<ApiSuccess<GoodsReceipt>>(
      `/goods-receipts/${id}`,
      payload,
    )
    return response.data.data
  },

  async complete(id: string, payload: CompleteGoodsReceiptPayload): Promise<GoodsReceipt> {
    const response = await httpClient.post<ApiSuccess<GoodsReceipt>>(
      `/goods-receipts/${id}/complete`,
      payload,
    )
    return response.data.data
  },

  async cancel(id: string, payload: CancelGoodsReceiptPayload): Promise<GoodsReceipt> {
    const response = await httpClient.post<ApiSuccess<GoodsReceipt>>(
      `/goods-receipts/${id}/cancel`,
      payload,
    )
    return response.data.data
  },

  async listComments(id: string): Promise<GoodsReceiptComment[]> {
    const response = await httpClient.get<ApiSuccess<GoodsReceiptComment[]>>(
      `/goods-receipts/${id}/comments`,
    )
    return response.data.data
  },

  async addComment(
    id: string,
    payload: AddGoodsReceiptCommentPayload,
  ): Promise<GoodsReceiptComment> {
    const response = await httpClient.post<ApiSuccess<GoodsReceiptComment>>(
      `/goods-receipts/${id}/comments`,
      payload,
    )
    return response.data.data
  },
}

/**
 * Badge color mapping per comment category (aligns with the ui/Badge `color`
 * palette): INTERNAL neutral/gray, APPROVAL success, EXTERNAL warning,
 * SYSTEM blue-light (`info`).
 */
export function commentCategoryBadgeColor(
  category: GoodsReceiptCommentCategoryDisplay,
): 'light' | 'success' | 'warning' | 'info' {
  switch (category) {
    case 'APPROVAL':
      return 'success'
    case 'EXTERNAL':
      return 'warning'
    case 'SYSTEM':
      return 'info'
    case 'INTERNAL':
    default:
      return 'light'
  }
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: GoodsReceiptStatus,
): 'light' | 'success' | 'error' {
  switch (status) {
    case 'COMPLETED':
      return 'success'
    case 'CANCELLED':
      return 'error'
    case 'DRAFT':
    default:
      return 'light'
  }
}
