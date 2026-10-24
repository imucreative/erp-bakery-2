/**
 * Stock Transfer service — company-scoped inter-outlet stock transfer documents
 * with a full lifecycle. Verified against the backend contract
 * (base path `/inventory/transfers`; StockTransfer entity + StockTransferItem).
 *
 *  - GET    /inventory/transfers              → { success, data: StockTransfer[], meta }
 *      guard: inventory.transfer.read
 *      filters: page, limit, sourceOutletId?, destinationOutletId?, status?,
 *               search? (transferNumber/notes)
 *      NOTE: each list row carries its `items` array (loaded per header), so the
 *      list shares the full entity shape. Item detail is already rich
 *      (batchNumber, lotNumber, expiredDate), so the list/detail need no batch
 *      lookup — only product/outlet names are resolved by the views.
 *  - GET    /inventory/transfers/:id          → { success, data: StockTransfer } (header + items)
 *      guard: inventory.transfer.read
 *  - POST   /inventory/transfers              → 201 DRAFT
 *      guard: inventory.transfer.create
 *      body: { sourceOutletId, destinationOutletId (≠ source), transferDate?
 *              'YYYY-MM-DD' (default today), notes?,
 *              items[>=1]{ sourceBatchId, productId, qty>0 } }
 *  - PUT    /inventory/transfers/:id          → update (DRAFT only; same body)
 *      guard: inventory.transfer.create
 *  - POST   /inventory/transfers/:id/submit   → DRAFT → SUBMITTED   guard: .create
 *      (locks the document; no stock movement yet)
 *  - POST   /inventory/transfers/:id/dispatch → SUBMITTED → IN_TRANSIT guard: .dispatch
 *      (posts TRANSFER_OUT; decrements the source batch; may 400 on invalid
 *       transition / insufficient stock)
 *  - POST   /inventory/transfers/:id/receive  → IN_TRANSIT → COMPLETED guard: .receive
 *      (posts TRANSFER_IN; the backend sets destinationBatchId automatically)
 *  - POST   /inventory/transfers/:id/cancel   → DRAFT|SUBMITTED → CANCELLED guard: .create
 *      (IN_TRANSIT and COMPLETED cannot be cancelled)
 *
 * CONTRACT NOTES (verified, mirrored by the UI):
 *  - The lifecycle actions (submit/dispatch/receive/cancel) take NO request body
 *    — the controller methods accept only the route id. The UI must NOT send a
 *    note for any action.
 *  - `destinationBatchId` on an item is null until the transfer is received
 *    (filled by the receive posting).
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

/** Lifecycle statuses (doc 35 §1 subset used by Stock Transfer). */
export const TRANSFER_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'IN_TRANSIT',
  'COMPLETED',
  'CANCELLED',
] as const
export type TransferStatus = (typeof TRANSFER_STATUSES)[number]

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Diajukan',
  IN_TRANSIT: 'Dalam Perjalanan',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
}

export interface StockTransferItem {
  id: string
  sourceBatchId: string
  productId: string
  qty: number
  batchNumber: string
  lotKey: string
  lotNumber: string | null
  /** ISO date string (date-only) or null for non-perishable stock. */
  expiredDate: string | null
  /** Filled only after receive (TRANSFER_IN posting); null before. */
  destinationBatchId: string | null
}

export interface StockTransfer {
  id: string
  companyId: string | null
  sourceOutletId: string
  destinationOutletId: string
  transferNumber: string
  transferDate: string
  status: TransferStatus
  notes: string | null
  items: StockTransferItem[]
  createdAt: string
  updatedAt: string
}

export interface StockTransferListParams {
  page: number
  limit: number
  sourceOutletId?: string
  destinationOutletId?: string
  status?: TransferStatus
  search?: string
}

export interface StockTransferListResult {
  items: StockTransfer[]
  meta: ListMeta
}

/** A single line item in the create/update payload. */
export interface StockTransferItemPayload {
  sourceBatchId: string
  productId: string
  qty: number
}

export interface SaveStockTransferPayload {
  sourceOutletId: string
  destinationOutletId: string
  transferDate?: string
  notes?: string
  items: StockTransferItemPayload[]
}

function toQuery(params: StockTransferListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    limit: params.limit,
  }
  if (params.sourceOutletId) {
    query.sourceOutletId = params.sourceOutletId
  }
  if (params.destinationOutletId) {
    query.destinationOutletId = params.destinationOutletId
  }
  if (params.status) {
    query.status = params.status
  }
  if (params.search) {
    query.search = params.search
  }
  return query
}

export const stockTransferService = {
  async list(params: StockTransferListParams): Promise<StockTransferListResult> {
    const response = await httpClient.get<ApiListResponse<StockTransfer>>('/inventory/transfers', {
      params: toQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getById(id: string): Promise<StockTransfer> {
    const response = await httpClient.get<ApiSuccess<StockTransfer>>(`/inventory/transfers/${id}`)
    return response.data.data
  },

  async create(payload: SaveStockTransferPayload): Promise<StockTransfer> {
    const response = await httpClient.post<ApiSuccess<StockTransfer>>(
      '/inventory/transfers',
      payload,
    )
    return response.data.data
  },

  async update(id: string, payload: SaveStockTransferPayload): Promise<StockTransfer> {
    const response = await httpClient.put<ApiSuccess<StockTransfer>>(
      `/inventory/transfers/${id}`,
      payload,
    )
    return response.data.data
  },

  // Lifecycle actions take no request body (backend-verified).
  async submit(id: string): Promise<StockTransfer> {
    const response = await httpClient.post<ApiSuccess<StockTransfer>>(
      `/inventory/transfers/${id}/submit`,
    )
    return response.data.data
  },

  async dispatch(id: string): Promise<StockTransfer> {
    const response = await httpClient.post<ApiSuccess<StockTransfer>>(
      `/inventory/transfers/${id}/dispatch`,
    )
    return response.data.data
  },

  async receive(id: string): Promise<StockTransfer> {
    const response = await httpClient.post<ApiSuccess<StockTransfer>>(
      `/inventory/transfers/${id}/receive`,
    )
    return response.data.data
  },

  async cancel(id: string): Promise<StockTransfer> {
    const response = await httpClient.post<ApiSuccess<StockTransfer>>(
      `/inventory/transfers/${id}/cancel`,
    )
    return response.data.data
  },
}

/** Badge color mapping per status (aligns with the ui/Badge `color` palette). */
export function statusBadgeColor(
  status: TransferStatus,
): 'light' | 'info' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'SUBMITTED':
      return 'info'
    case 'IN_TRANSIT':
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
