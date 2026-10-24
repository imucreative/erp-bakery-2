/**
 * Purchase Order service — company-scoped document CRUD + lifecycle actions.
 * Verified against the final PO backend contract (Tahap 1).
 *
 *  - GET    /purchase-orders            → { success, data: PurchaseOrder[], meta } (paginated)
 *      filters: page, limit, status?, supplierId?, destinationOutletId?,
 *               purchaseRequestId?, search? (poNumber)
 *  - GET    /purchase-orders/:id        → { success, data: PurchaseOrder } (+ items + statusLogs)
 *  - POST   /purchase-orders            → 201 DRAFT (subtotal/tax/total computed server-side)
 *      body: { purchaseRequestId (PR must be APPROVED), supplierId (active),
 *              orderDate "YYYY-MM-DD", paymentTermId?, notes?,
 *              items?[{ productId, quantity>0, uomId, unitPrice>=0, taxPercent>=0 }] }
 *      When items are omitted the backend prefills them from the source PR.
 *  - PUT    /purchase-orders/:id        → update (only in DRAFT or REJECTED)
 *  - POST   /purchase-orders/:id/submit → DRAFT → SUBMITTED
 *  - POST   /purchase-orders/:id/approve → SUBMITTED → APPROVED  (body { note? })
 *  - POST   /purchase-orders/:id/reject  → SUBMITTED → REJECTED  (body { note } required)
 *  - POST   /purchase-orders/:id/cancel  → DRAFT|REJECTED|APPROVED → CANCELLED (body { note? })
 *
 * Anti-tamper: `subtotal`, `taxAmount`, `total`, `totalAmount`, `taxTotal`,
 * `grandTotal` and `estimatedPaymentDueDate` are authoritative on the server;
 * create/update payloads intentionally omit them.
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

export const PURCHASE_ORDER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number]

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}

export interface PurchaseOrderItem {
  id: string
  productId: string
  quantity: number
  uomId: string
  unitPrice: number
  taxPercent: number
  subtotal: number
  taxAmount: number
  total: number
}

export interface PurchaseOrderStatusLog {
  id: string
  fromStatus: PurchaseOrderStatus | null
  toStatus: PurchaseOrderStatus
  actorId: string | null
  actorName: string | null
  note: string | null
  createdAt: string
}

/**
 * Comment categories. INTERNAL/APPROVAL/EXTERNAL are user-selectable and sent to
 * the backend; SYSTEM is display-only (backend-authored) and never submitted.
 */
export const PURCHASE_ORDER_COMMENT_CATEGORIES = ['INTERNAL', 'APPROVAL', 'EXTERNAL'] as const
export type PurchaseOrderCommentCategory = (typeof PURCHASE_ORDER_COMMENT_CATEGORIES)[number]

/** Full set including SYSTEM, used only for rendering existing comments. */
export type PurchaseOrderCommentCategoryDisplay = PurchaseOrderCommentCategory | 'SYSTEM'

export const PURCHASE_ORDER_COMMENT_CATEGORY_LABELS: Record<
  PurchaseOrderCommentCategoryDisplay,
  string
> = {
  INTERNAL: 'Internal',
  APPROVAL: 'Persetujuan',
  EXTERNAL: 'Eksternal',
  SYSTEM: 'Sistem',
}

export interface PurchaseOrderComment {
  id: string
  category: PurchaseOrderCommentCategoryDisplay
  body: string
  authorId: string
  authorName: string | null
  createdAt: string
}

export interface AddPurchaseOrderCommentPayload {
  body: string
  category?: PurchaseOrderCommentCategory
}

/**
 * A stored attachment on a Purchase Order. The backend never exposes the
 * physical `storedPath`; the UI works purely with metadata + the download
 * stream endpoint.
 */
export interface PurchaseOrderAttachment {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
  uploadedByName: string | null
  createdAt: string
}

export interface PurchaseOrder {
  id: string
  companyId: string | null
  poNumber: string
  purchaseRequestId: string
  supplierId: string
  destinationOutletId: string
  orderDate: string
  paymentTermId: string | null
  paymentTermCode: string | null
  paymentTermName: string | null
  paymentTermDueDays: number | null
  estimatedPaymentDueDate: string | null
  totalAmount: number
  taxTotal: number
  grandTotal: number
  status: PurchaseOrderStatus
  notes: string | null
  items: PurchaseOrderItem[]
  statusLogs: PurchaseOrderStatusLog[]
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrderListParams {
  page: number
  limit: number
  status?: PurchaseOrderStatus
  supplierId?: string
  destinationOutletId?: string
  purchaseRequestId?: string
  search?: string
  /**
   * Picker-only filter: when `true`, restrict the result to APPROVED POs that
   * still have ≥1 item with outstanding > 0 (not yet fully received by other
   * GRs). Used by the GR form's source-PO picker so fully-received POs don't
   * appear. Sent as the string `'true'`; omitted when false/undefined so the
   * main List page keeps its full, unfiltered contract.
   */
  receivable?: boolean
}

export interface PurchaseOrderListResult {
  items: PurchaseOrder[]
  meta: ListMeta
}

/** A single line item in the create/update payload (server computes subtotal/tax/total). */
export interface PurchaseOrderItemPayload {
  productId: string
  quantity: number
  uomId: string
  unitPrice: number
  taxPercent: number
}

/**
 * A single source-PR item with its cross-PO outstanding (remaining) quota.
 * Returned by `GET /purchase-orders/outstanding`. The backend enforces that a
 * PO item quantity may not exceed `outstandingQuantity`, which is the PR item
 * quantity minus the quantity already consumed by other ACTIVE POs:
 *   outstandingQuantity = prQuantity − consumedQuantity   (clamped ≥ 0)
 * In edit mode the backend excludes the PO being edited, so its own consumption
 * is added back (available again for this PO).
 */
export interface PurchaseOrderOutstandingItem {
  productId: string
  prQuantity: number
  consumedQuantity: number
  outstandingQuantity: number
  uomId: string
  estimatedPrice: number
}

export interface SavePurchaseOrderPayload {
  purchaseRequestId: string
  supplierId: string
  orderDate: string
  paymentTermId?: string
  notes?: string
  items?: PurchaseOrderItemPayload[]
}

export interface ApprovePurchaseOrderPayload {
  note?: string
}

export interface RejectPurchaseOrderPayload {
  note: string
}

export interface CancelPurchaseOrderPayload {
  note?: string
}

function toQuery(params: PurchaseOrderListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.supplierId) {
    query.supplierId = params.supplierId
  }
  if (params.destinationOutletId) {
    query.destinationOutletId = params.destinationOutletId
  }
  if (params.purchaseRequestId) {
    query.purchaseRequestId = params.purchaseRequestId
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.receivable) {
    query.receivable = 'true'
  }
  return query
}

export const purchaseOrderService = {
  async list(params: PurchaseOrderListParams): Promise<PurchaseOrderListResult> {
    const response = await httpClient.get<ApiListResponse<PurchaseOrder>>('/purchase-orders', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<PurchaseOrder> {
    const response = await httpClient.get<ApiSuccess<PurchaseOrder>>(`/purchase-orders/${id}`)
    return response.data.data
  },

  /**
   * Outstanding (remaining) PR-item quota across ACTIVE POs for a source PR.
   * Used by the PO form editor to constrain items to what is still unordered.
   *
   *   GET /purchase-orders/outstanding?purchaseRequestId=<uuid>
   *       [&excludePurchaseOrderId=<uuid>]
   *
   * `excludePurchaseOrderId` is sent in edit mode (the PO being edited) so its
   * own consumption is not counted against the quota. Each item's
   * `outstandingQuantity` is already clamped ≥ 0 by the backend. A 404 is
   * returned when the PR does not exist.
   */
  async getOutstanding(
    purchaseRequestId: string,
    excludePurchaseOrderId?: string,
  ): Promise<PurchaseOrderOutstandingItem[]> {
    const params: Record<string, string> = { purchaseRequestId }
    if (excludePurchaseOrderId) {
      params.excludePurchaseOrderId = excludePurchaseOrderId
    }
    const response = await httpClient.get<
      ApiSuccess<{ purchaseRequestId: string; items: PurchaseOrderOutstandingItem[] }>
    >('/purchase-orders/outstanding', { params })
    return response.data.data.items
  },

  async create(payload: SavePurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrder>>('/purchase-orders', payload)
    return response.data.data
  },

  async update(id: string, payload: SavePurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await httpClient.put<ApiSuccess<PurchaseOrder>>(
      `/purchase-orders/${id}`,
      payload,
    )
    return response.data.data
  },

  async submit(id: string): Promise<PurchaseOrder> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrder>>(
      `/purchase-orders/${id}/submit`,
    )
    return response.data.data
  },

  async approve(id: string, payload: ApprovePurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrder>>(
      `/purchase-orders/${id}/approve`,
      payload,
    )
    return response.data.data
  },

  async reject(id: string, payload: RejectPurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrder>>(
      `/purchase-orders/${id}/reject`,
      payload,
    )
    return response.data.data
  },

  async cancel(id: string, payload: CancelPurchaseOrderPayload): Promise<PurchaseOrder> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrder>>(
      `/purchase-orders/${id}/cancel`,
      payload,
    )
    return response.data.data
  },

  async listComments(id: string): Promise<PurchaseOrderComment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseOrderComment[]>>(
      `/purchase-orders/${id}/comments`,
    )
    return response.data.data
  },

  async addComment(
    id: string,
    payload: AddPurchaseOrderCommentPayload,
  ): Promise<PurchaseOrderComment> {
    const response = await httpClient.post<ApiSuccess<PurchaseOrderComment>>(
      `/purchase-orders/${id}/comments`,
      payload,
    )
    return response.data.data
  },

  async listAttachments(id: string): Promise<PurchaseOrderAttachment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseOrderAttachment[]>>(
      `/purchase-orders/${id}/attachments`,
    )
    return response.data.data
  },

  /**
   * Upload a single attachment as `multipart/form-data` (field name `file`).
   *
   * We deliberately do NOT set a `Content-Type` header: when the request body
   * is a `FormData`, axios/the browser sets `multipart/form-data` together with
   * the correct `boundary` automatically. Setting it manually would omit the
   * boundary and break the upload. The request interceptor still attaches the
   * `Authorization: Bearer` and `X-Company-Id` headers.
   */
  async uploadAttachment(id: string, file: File): Promise<PurchaseOrderAttachment> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<ApiSuccess<PurchaseOrderAttachment>>(
      `/purchase-orders/${id}/attachments`,
      formData,
    )
    return response.data.data
  },

  async deleteAttachment(id: string, attId: string): Promise<void> {
    await httpClient.delete(`/purchase-orders/${id}/attachments/${attId}`)
  },

  /**
   * Download an attachment. The endpoint streams the file and requires an
   * `Authorization: Bearer` header, so a plain `<a href>` cannot be used — we
   * fetch it as a blob (interceptor adds auth), derive the filename from the
   * `Content-Disposition` header (fallback `originalName`), then trigger a
   * browser download via a temporary object URL.
   */
  async downloadAttachment(id: string, attId: string, fallbackName: string): Promise<void> {
    const response = await httpClient.get<Blob>(
      `/purchase-orders/${id}/attachments/${attId}/download`,
      { responseType: 'blob' },
    )
    const disposition = (response.headers['content-disposition'] as string | undefined) ?? null
    const fileName = filenameFromContentDisposition(disposition) ?? fallbackName
    triggerBlobDownload(response.data, fileName)
  },
}

/** Parse a `filename="..."` (or RFC 5987 `filename*=`) from Content-Disposition. */
function filenameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null
  }
  // RFC 5987: filename*=UTF-8''<url-encoded>
  const extendedMatch = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header)
  if (extendedMatch?.[1]) {
    try {
      return decodeURIComponent(extendedMatch[1].trim().replace(/^"|"$/g, ''))
    } catch {
      // fall through to the quoted variant
    }
  }
  const quotedMatch = /filename="?([^";]+)"?/i.exec(header)
  if (quotedMatch?.[1]) {
    return quotedMatch[1].trim()
  }
  return null
}

/** Trigger a browser download for a blob using a temporary object URL. */
function triggerBlobDownload(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(objectUrl)
}

/**
 * Badge color mapping per comment category (aligns with the ui/Badge `color`
 * palette): INTERNAL neutral/gray, APPROVAL brand/success, EXTERNAL warning,
 * SYSTEM blue-light (`info`).
 */
export function commentCategoryBadgeColor(
  category: PurchaseOrderCommentCategoryDisplay,
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
  status: PurchaseOrderStatus,
): 'light' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'SUBMITTED':
      return 'warning'
    case 'APPROVED':
      return 'success'
    case 'REJECTED':
      return 'error'
    case 'DRAFT':
    case 'CANCELLED':
    default:
      return 'light'
  }
}
