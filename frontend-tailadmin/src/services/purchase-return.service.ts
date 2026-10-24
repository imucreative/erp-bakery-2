/**
 * Purchase Return service — company-scoped document CRUD + lifecycle actions.
 * Verified against the Purchase Return backend contract (Tahap 1 + 2). Purchase
 * Return is the fourth procurement document: it reverses goods received on a
 * COMPLETED Goods Receipt back to the vendor, posting an inventory RETURN
 * movement when it completes. The pattern mirrors Goods Receipt.
 *
 *  - GET    /purchase-returns             → { success, data: PurchaseReturn[], meta } (paginated)
 *      filters: page, limit, status?, goodsReceiptId?, supplierId?, outletId?,
 *               search? (returnNumber / notes)
 *      Guard `procurement.return.read`. Each row carries items[] + statusLogs[].
 *  - GET    /purchase-returns/returnable?goodsReceiptId=<uuid>
 *      → { success, data: { goodsReceiptId, items: ReturnableLine[] } }.
 *      Guard `procurement.return.create`.
 *      The returnable lines of a COMPLETED Goods Receipt: for each posted GR
 *      line it reports postedAcceptedQuantity, how much is already returned
 *      (completedReturnQuantity + submittedReturnQuantity), and the remaining
 *      returnableQuantity. Used by the create form to list what can be returned.
 *  - GET    /purchase-returns/:id         → { success, data: PurchaseReturn } (+ items + statusLogs)
 *      Guard `procurement.return.read`.
 *  - POST   /purchase-returns             → 201 DRAFT. Guard `procurement.return.create`.
 *      body: { goodsReceiptId (required UUID), returnDate? "YYYY-MM-DD", notes?,
 *              items[>=1]{ goodsReceiptItemId, returnQuantity (>0), reason,
 *                reasonDescription? } }
 *      supplier/outlet are INHERITED from the source GR by the backend — never
 *      sent. The backend's create/update DTO uses `forbidNonWhitelisted` and
 *      accepts ONLY those 4 fields per item: `goodsReceiptItemId`,
 *      `returnQuantity`, `reason`, and `reasonDescription?`. Every snapshot
 *      field (sourceBatchId, sourceMovementId, productId, productSku,
 *      productName, uomId, uomCode, batchNumber, lotNumber, expiredDate,
 *      postedAcceptedQuantity, previouslyReturnedQuantity) is DERIVED
 *      SERVER-SIDE from the returnable set (anti-tamper) and is REJECTED (400)
 *      if sent by the client — so the payload must never include them.
 *      `reasonDescription` is REQUIRED when `reason === 'OTHER'` (backend
 *      validates 400; mirrored here).
 *  - PUT    /purchase-returns/:id         → update (DRAFT only; same body)
 *      Guard `procurement.return.update`.
 *  - POST   /purchase-returns/:id/submit  → DRAFT → SUBMITTED. Guard `.create`. body { note? }
 *  - POST   /purchase-returns/:id/complete→ SUBMITTED → COMPLETED (posts the
 *      inventory RETURN reversal, idempotent). Guard `.complete`. body { note? }
 *      After COMPLETED the return is terminal/read-only.
 *  - POST   /purchase-returns/:id/cancel  → DRAFT|SUBMITTED → CANCELLED.
 *      Guard `.update`. body { note? }
 *
 * Comments:
 *  - GET  /purchase-returns/:id/comments  (guard `.read`)
 *  - POST /purchase-returns/:id/comments  (guard `.read`;
 *      body { category? (INTERNAL|APPROVAL|EXTERNAL, default INTERNAL), body })
 *      Response carries `authorName`.
 * Attachments:
 *  - GET    /purchase-returns/:id/attachments                   (guard `.read`)
 *  - POST   /purchase-returns/:id/attachments                   (guard `.update`,
 *      multipart field `file`, max 5 MB, pdf/jpg/png)
 *  - GET    /purchase-returns/:id/attachments/:attId/download   (guard `.read`)
 *  - DELETE /purchase-returns/:id/attachments/:attId            (guard `.update`)
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

export const PURCHASE_RETURN_STATUSES = ['DRAFT', 'SUBMITTED', 'COMPLETED', 'CANCELLED'] as const
export type PurchaseReturnStatus = (typeof PURCHASE_RETURN_STATUSES)[number]

export const PURCHASE_RETURN_STATUS_LABELS: Record<PurchaseReturnStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

/** Return reasons (backend-authoritative enum, mirrored for the UI select). */
export const PURCHASE_RETURN_REASONS = [
  'DAMAGED',
  'WRONG_ITEM',
  'QUALITY_ISSUE',
  'EXPIRED',
  'OVER_DELIVERY',
  'OTHER',
] as const
export type PurchaseReturnReason = (typeof PURCHASE_RETURN_REASONS)[number]

export const PURCHASE_RETURN_REASON_LABELS: Record<PurchaseReturnReason, string> = {
  DAMAGED: 'Rusak',
  WRONG_ITEM: 'Barang Salah',
  QUALITY_ISSUE: 'Masalah Kualitas',
  EXPIRED: 'Kedaluwarsa',
  OVER_DELIVERY: 'Kelebihan Kirim',
  OTHER: 'Lainnya',
}

export interface PurchaseReturnItem {
  id: string
  goodsReceiptItemId: string
  sourceBatchId: string
  sourceMovementId: string
  productId: string
  productSku: string
  productName: string
  uomId: string
  uomCode: string
  uomName: string
  batchNumber: string | null
  lotNumber: string | null
  expiredDate: string | null
  postedAcceptedQuantity: number
  previouslyReturnedQuantity: number
  returnQuantity: number
  reason: PurchaseReturnReason
  reasonDescription: string | null
}

export interface PurchaseReturnStatusLog {
  id: string
  fromStatus: PurchaseReturnStatus | null
  toStatus: PurchaseReturnStatus
  actorId: string | null
  actorName: string | null
  note: string | null
  createdAt: string
}

/**
 * Comment categories. INTERNAL/APPROVAL/EXTERNAL are user-selectable and sent to
 * the backend; SYSTEM is display-only (backend-authored) and never submitted.
 */
export const PURCHASE_RETURN_COMMENT_CATEGORIES = ['INTERNAL', 'APPROVAL', 'EXTERNAL'] as const
export type PurchaseReturnCommentCategory = (typeof PURCHASE_RETURN_COMMENT_CATEGORIES)[number]

/** Full set including SYSTEM, used only for rendering existing comments. */
export type PurchaseReturnCommentCategoryDisplay = PurchaseReturnCommentCategory | 'SYSTEM'

export const PURCHASE_RETURN_COMMENT_CATEGORY_LABELS: Record<
  PurchaseReturnCommentCategoryDisplay,
  string
> = {
  INTERNAL: 'Internal',
  APPROVAL: 'Persetujuan',
  EXTERNAL: 'Eksternal',
  SYSTEM: 'Sistem',
}

export interface PurchaseReturnComment {
  id: string
  category: PurchaseReturnCommentCategoryDisplay
  body: string
  authorId: string
  authorName: string | null
  createdAt: string
}

export interface AddPurchaseReturnCommentPayload {
  body: string
  category?: PurchaseReturnCommentCategory
}

/**
 * A stored attachment on a Purchase Return. The backend never exposes the
 * physical `storedPath`; the UI works purely with metadata + the download
 * stream endpoint.
 */
export interface PurchaseReturnAttachment {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
  uploadedByName: string | null
  createdAt: string
}

export interface PurchaseReturn {
  id: string
  companyId: string | null
  returnNumber: string
  goodsReceiptId: string
  purchaseOrderId: string
  supplierId: string
  supplierCode: string
  supplierName: string
  outletId: string
  outletCode: string
  outletName: string
  returnDate: string
  status: PurchaseReturnStatus
  notes: string | null
  items: PurchaseReturnItem[]
  statusLogs: PurchaseReturnStatusLog[]
  createdAt: string
  updatedAt: string
  submittedAt: string | null
  completedAt: string | null
  cancelledAt: string | null
}

export interface PurchaseReturnListParams {
  page: number
  limit: number
  status?: PurchaseReturnStatus
  goodsReceiptId?: string
  supplierId?: string
  outletId?: string
  search?: string
}

export interface PurchaseReturnListResult {
  items: PurchaseReturn[]
  meta: ListMeta
}

/**
 * A single returnable line of a COMPLETED source Goods Receipt. Returned by
 * `GET /purchase-returns/returnable`. The backend enforces that a return line's
 * `returnQuantity` may not exceed `returnableQuantity`:
 *   returnableQuantity = postedAcceptedQuantity
 *     − completedReturnQuantity − submittedReturnQuantity   (clamped ≥ 0)
 * The snapshot fields (sku/name/uom/batch/lot/expiry/sourceBatchId/
 * sourceMovementId) are carried verbatim into the create payload.
 */
export interface ReturnableLine {
  goodsReceiptItemId: string
  sourceBatchId: string
  sourceMovementId: string
  productId: string
  productSku: string
  productName: string
  uomId: string
  uomCode: string
  uomName: string
  batchNumber: string | null
  lotNumber: string | null
  expiredDate: string | null
  postedAcceptedQuantity: number
  completedReturnQuantity: number
  submittedReturnQuantity: number
  returnableQuantity: number
}

/**
 * A single line item in the create/update payload.
 *
 * The backend DTO (`forbidNonWhitelisted: true`) accepts ONLY these four
 * fields. All snapshot fields are derived server-side from the returnable set
 * and are rejected if sent — do not add them here. `reasonDescription` is
 * required when `reason === 'OTHER'`.
 */
export interface PurchaseReturnItemPayload {
  goodsReceiptItemId: string
  returnQuantity: number
  reason: PurchaseReturnReason
  reasonDescription?: string
}

export interface SavePurchaseReturnPayload {
  goodsReceiptId: string
  returnDate?: string
  notes?: string
  items: PurchaseReturnItemPayload[]
}

export interface SubmitPurchaseReturnPayload {
  note?: string
}

export interface CompletePurchaseReturnPayload {
  note?: string
}

export interface CancelPurchaseReturnPayload {
  note?: string
}

function toQuery(params: PurchaseReturnListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.goodsReceiptId) {
    query.goodsReceiptId = params.goodsReceiptId
  }
  if (params.supplierId) {
    query.supplierId = params.supplierId
  }
  if (params.outletId) {
    query.outletId = params.outletId
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const purchaseReturnService = {
  async list(params: PurchaseReturnListParams): Promise<PurchaseReturnListResult> {
    const response = await httpClient.get<ApiListResponse<PurchaseReturn>>('/purchase-returns', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<PurchaseReturn> {
    const response = await httpClient.get<ApiSuccess<PurchaseReturn>>(`/purchase-returns/${id}`)
    return response.data.data
  },

  /**
   * Returnable lines of a COMPLETED source Goods Receipt. Used by the create
   * form to list what can still be returned per GR line, with the per-row cap
   * (`returnableQuantity`) and the snapshot fields carried into the payload.
   *
   *   GET /purchase-returns/returnable?goodsReceiptId=<uuid>
   *
   * The backend wraps the result as `{ goodsReceiptId, items: ReturnableLine[] }`
   * (the echoed `goodsReceiptId` carries source context). This method unwraps
   * and returns the `items` array so callers get a plain `ReturnableLine[]`;
   * when `items` is absent it falls back to `[]`.
   */
  async getReturnable(goodsReceiptId: string): Promise<ReturnableLine[]> {
    const response = await httpClient.get<
      ApiSuccess<{ goodsReceiptId: string; items: ReturnableLine[] }>
    >('/purchase-returns/returnable', { params: { goodsReceiptId } })
    return response.data.data?.items ?? []
  },

  async create(payload: SavePurchaseReturnPayload): Promise<PurchaseReturn> {
    const response = await httpClient.post<ApiSuccess<PurchaseReturn>>('/purchase-returns', payload)
    return response.data.data
  },

  async update(id: string, payload: SavePurchaseReturnPayload): Promise<PurchaseReturn> {
    const response = await httpClient.put<ApiSuccess<PurchaseReturn>>(
      `/purchase-returns/${id}`,
      payload,
    )
    return response.data.data
  },

  async submit(id: string, payload: SubmitPurchaseReturnPayload): Promise<PurchaseReturn> {
    const response = await httpClient.post<ApiSuccess<PurchaseReturn>>(
      `/purchase-returns/${id}/submit`,
      payload,
    )
    return response.data.data
  },

  async complete(id: string, payload: CompletePurchaseReturnPayload): Promise<PurchaseReturn> {
    const response = await httpClient.post<ApiSuccess<PurchaseReturn>>(
      `/purchase-returns/${id}/complete`,
      payload,
    )
    return response.data.data
  },

  async cancel(id: string, payload: CancelPurchaseReturnPayload): Promise<PurchaseReturn> {
    const response = await httpClient.post<ApiSuccess<PurchaseReturn>>(
      `/purchase-returns/${id}/cancel`,
      payload,
    )
    return response.data.data
  },

  async listComments(id: string): Promise<PurchaseReturnComment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseReturnComment[]>>(
      `/purchase-returns/${id}/comments`,
    )
    return response.data.data
  },

  async addComment(
    id: string,
    payload: AddPurchaseReturnCommentPayload,
  ): Promise<PurchaseReturnComment> {
    const response = await httpClient.post<ApiSuccess<PurchaseReturnComment>>(
      `/purchase-returns/${id}/comments`,
      payload,
    )
    return response.data.data
  },

  async listAttachments(id: string): Promise<PurchaseReturnAttachment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseReturnAttachment[]>>(
      `/purchase-returns/${id}/attachments`,
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
  async uploadAttachment(id: string, file: File): Promise<PurchaseReturnAttachment> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<ApiSuccess<PurchaseReturnAttachment>>(
      `/purchase-returns/${id}/attachments`,
      formData,
    )
    return response.data.data
  },

  async deleteAttachment(id: string, attId: string): Promise<void> {
    await httpClient.delete(`/purchase-returns/${id}/attachments/${attId}`)
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
      `/purchase-returns/${id}/attachments/${attId}/download`,
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
 * palette): INTERNAL neutral/gray, APPROVAL success, EXTERNAL warning,
 * SYSTEM blue-light (`info`).
 */
export function commentCategoryBadgeColor(
  category: PurchaseReturnCommentCategoryDisplay,
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
  status: PurchaseReturnStatus,
): 'light' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'SUBMITTED':
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
