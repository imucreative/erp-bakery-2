/**
 * Purchase Request service — company-scoped document CRUD + lifecycle actions.
 * Verified against the final PR backend contract (Tahap 1) and doc 34 blueprint.
 *
 *  - GET    /purchase-requests            → { success, data: PurchaseRequest[], meta } (paginated)
 *      filters: page, limit, status?, destinationOutletId?, search? (prNumber)
 *  - GET    /purchase-requests/:id        → { success, data: PurchaseRequest } (+ items + statusLogs)
 *  - POST   /purchase-requests            → 201 DRAFT (subtotal/total computed server-side)
 *  - PUT    /purchase-requests/:id        → update (only in DRAFT or REJECTED)
 *  - POST   /purchase-requests/:id/submit → DRAFT → SUBMITTED
 *  - POST   /purchase-requests/:id/approve → SUBMITTED → APPROVED  (body { note? })
 *  - POST   /purchase-requests/:id/reject  → SUBMITTED → REJECTED  (body { note } required)
 *  - POST   /purchase-requests/:id/cancel  → DRAFT|REJECTED → CANCELLED (body { note? })
 *
 * Anti-tamper: `subtotal` and `totalEstimatedAmount` are authoritative on the
 * server; create/update payloads intentionally omit them.
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

export const PURCHASE_REQUEST_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const
export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number]

export const PURCHASE_REQUEST_STATUS_LABELS: Record<PurchaseRequestStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
  CANCELLED: 'Dibatalkan',
}

export interface PurchaseRequestItem {
  id: string
  productId: string
  quantity: number
  uomId: string
  estimatedPrice: number
  subtotal: number
}

export interface PurchaseRequestStatusLog {
  id: string
  fromStatus: PurchaseRequestStatus | null
  toStatus: PurchaseRequestStatus
  actorId: string
  actorName: string | null
  note: string | null
  createdAt: string
}

/**
 * Comment categories. INTERNAL/APPROVAL/EXTERNAL are user-selectable and sent to
 * the backend; SYSTEM is display-only (backend-authored) and never submitted.
 */
export const PURCHASE_REQUEST_COMMENT_CATEGORIES = ['INTERNAL', 'APPROVAL', 'EXTERNAL'] as const
export type PurchaseRequestCommentCategory = (typeof PURCHASE_REQUEST_COMMENT_CATEGORIES)[number]

/** Full set including SYSTEM, used only for rendering existing comments. */
export type PurchaseRequestCommentCategoryDisplay = PurchaseRequestCommentCategory | 'SYSTEM'

export const PURCHASE_REQUEST_COMMENT_CATEGORY_LABELS: Record<
  PurchaseRequestCommentCategoryDisplay,
  string
> = {
  INTERNAL: 'Internal',
  APPROVAL: 'Persetujuan',
  EXTERNAL: 'Eksternal',
  SYSTEM: 'Sistem',
}

export interface PurchaseRequestComment {
  id: string
  category: PurchaseRequestCommentCategoryDisplay
  body: string
  authorId: string
  authorName: string | null
  createdAt: string
}

export interface AddPurchaseRequestCommentPayload {
  body: string
  category?: PurchaseRequestCommentCategory
}

/**
 * A stored attachment on a Purchase Request. The backend never exposes the
 * physical `storedPath`; the UI works purely with metadata + the download
 * stream endpoint.
 */
export interface PurchaseRequestAttachment {
  id: string
  originalName: string
  mimeType: string
  sizeBytes: number
  uploadedBy: string
  uploadedByName: string | null
  createdAt: string
}

export interface PurchaseRequest {
  id: string
  companyId: string | null
  prNumber: string
  requestorId: string
  destinationOutletId: string
  expectedDate: string
  totalEstimatedAmount: number
  status: PurchaseRequestStatus
  notes: string | null
  createdAt: string
  updatedAt: string
  items: PurchaseRequestItem[]
  statusLogs: PurchaseRequestStatusLog[]
}

export interface PurchaseRequestListParams {
  page: number
  limit: number
  status?: PurchaseRequestStatus
  destinationOutletId?: string
  search?: string
  /**
   * Picker-only filter: when `true`, restrict the result to APPROVED PRs that
   * still have ≥1 item with outstanding > 0 (not yet fully consumed by other
   * active POs). Used by the PO form's source-PR picker so fully-ordered PRs
   * don't appear. Sent as the string `'true'`; omitted when false/undefined so
   * the main List page keeps its full, unfiltered contract.
   */
  orderable?: boolean
}

export interface PurchaseRequestListResult {
  items: PurchaseRequest[]
  meta: ListMeta
}

/** A single line item in the create/update payload (no subtotal — server computes). */
export interface PurchaseRequestItemPayload {
  productId: string
  quantity: number
  uomId: string
  estimatedPrice: number
}

export interface SavePurchaseRequestPayload {
  destinationOutletId: string
  expectedDate: string
  notes?: string
  items: PurchaseRequestItemPayload[]
}

export interface ApprovePurchaseRequestPayload {
  note?: string
}

export interface RejectPurchaseRequestPayload {
  note: string
}

export interface CancelPurchaseRequestPayload {
  note?: string
}

function toQuery(params: PurchaseRequestListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.destinationOutletId) {
    query.destinationOutletId = params.destinationOutletId
  }
  if (params.search) {
    query.search = params.search
  }
  if (params.orderable) {
    query.orderable = 'true'
  }
  return query
}

export const purchaseRequestService = {
  async list(params: PurchaseRequestListParams): Promise<PurchaseRequestListResult> {
    const response = await httpClient.get<ApiListResponse<PurchaseRequest>>('/purchase-requests', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<PurchaseRequest> {
    const response = await httpClient.get<ApiSuccess<PurchaseRequest>>(`/purchase-requests/${id}`)
    return response.data.data
  },

  async create(payload: SavePurchaseRequestPayload): Promise<PurchaseRequest> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequest>>(
      '/purchase-requests',
      payload,
    )
    return response.data.data
  },

  async update(id: string, payload: SavePurchaseRequestPayload): Promise<PurchaseRequest> {
    const response = await httpClient.put<ApiSuccess<PurchaseRequest>>(
      `/purchase-requests/${id}`,
      payload,
    )
    return response.data.data
  },

  async submit(id: string): Promise<PurchaseRequest> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequest>>(
      `/purchase-requests/${id}/submit`,
    )
    return response.data.data
  },

  async approve(id: string, payload: ApprovePurchaseRequestPayload): Promise<PurchaseRequest> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequest>>(
      `/purchase-requests/${id}/approve`,
      payload,
    )
    return response.data.data
  },

  async reject(id: string, payload: RejectPurchaseRequestPayload): Promise<PurchaseRequest> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequest>>(
      `/purchase-requests/${id}/reject`,
      payload,
    )
    return response.data.data
  },

  async cancel(id: string, payload: CancelPurchaseRequestPayload): Promise<PurchaseRequest> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequest>>(
      `/purchase-requests/${id}/cancel`,
      payload,
    )
    return response.data.data
  },

  async listComments(id: string): Promise<PurchaseRequestComment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseRequestComment[]>>(
      `/purchase-requests/${id}/comments`,
    )
    return response.data.data
  },

  async addComment(
    id: string,
    payload: AddPurchaseRequestCommentPayload,
  ): Promise<PurchaseRequestComment> {
    const response = await httpClient.post<ApiSuccess<PurchaseRequestComment>>(
      `/purchase-requests/${id}/comments`,
      payload,
    )
    return response.data.data
  },

  async listAttachments(id: string): Promise<PurchaseRequestAttachment[]> {
    const response = await httpClient.get<ApiSuccess<PurchaseRequestAttachment[]>>(
      `/purchase-requests/${id}/attachments`,
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
  async uploadAttachment(id: string, file: File): Promise<PurchaseRequestAttachment> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await httpClient.post<ApiSuccess<PurchaseRequestAttachment>>(
      `/purchase-requests/${id}/attachments`,
      formData,
    )
    return response.data.data
  },

  async deleteAttachment(id: string, attId: string): Promise<void> {
    await httpClient.delete(`/purchase-requests/${id}/attachments/${attId}`)
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
      `/purchase-requests/${id}/attachments/${attId}/download`,
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
  category: PurchaseRequestCommentCategoryDisplay,
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
  status: PurchaseRequestStatus,
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
