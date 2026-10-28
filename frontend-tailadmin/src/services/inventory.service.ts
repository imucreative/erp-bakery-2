/**
 * Inventory service — read-only inventory views (company/tenant-scoped).
 *
 *  - GET /inventory/stock-on-hand → { success, data: StockOnHandRow[], meta } (paginated)
 *      guard: inventory.read
 *      filters: page, limit, outletId?, productId?, search? (name/SKU), lowOnly? ('true')
 *
 *  - GET /inventory/ledger → { success, data: InventoryMovementRow[], meta } (paginated)
 *      guard: inventory.read
 *      filters: page, limit, outletId?, productId?, batchId?, movementType?
 *
 * Stock-On-Hand is the canonical read view of current inventory: `qtyAvailable`
 * is the summed balance of active batches (doc 35 §8). Stock Ledger is the
 * canonical read view of inventory history: it reads the immutable
 * `InventoryMovement` ledger (doc 35 §8). Both are read-only modules — there
 * are no create/update/lifecycle actions.
 *
 * The ledger endpoint returns RAW movement rows that carry IDs only (no joined
 * product/outlet names); the view resolves names via one-time lookup maps.
 */

import { httpClient } from './http'

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

/**
 * A single Stock-On-Hand row: a product's available balance at one outlet.
 * `qtyAvailable` is summed from active batches on the backend (source of truth).
 * `isLow` is backend-derived (true when qtyAvailable < minimumStock, and only
 * when minimumStock > 0).
 */
export interface StockOnHandRow {
  productId: string
  productSku: string
  productName: string
  outletId: string
  outletName: string
  /** Base unit of measure of the product (display only, from the backend). */
  uomId: string
  /** Short UOM code, e.g. "KG"/"PCS" (display only, from the backend). */
  uomCode: string
  /** Full UOM name, e.g. "Kilogram" (display only, from the backend). */
  uomName: string
  qtyAvailable: number
  minimumStock: number
  isLow: boolean
}

export interface StockOnHandListParams {
  page: number
  limit: number
  outletId?: string
  productId?: string
  search?: string
  /**
   * When `true`, restrict results to products below their minimum stock. Sent
   * as the string `'true'`; omitted when false/undefined so the default list
   * keeps its full, unfiltered contract.
   */
  lowOnly?: boolean
}

export interface StockOnHandListResult {
  items: StockOnHandRow[]
  meta: ListMeta
}

function toStockOnHandQuery(params: StockOnHandListParams): Record<string, string | number> {
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
  if (params.search) {
    query.search = params.search
  }
  if (params.lowOnly) {
    query.lowOnly = 'true'
  }
  return query
}

/**
 * Canonical inventory movement types (doc 35 §8). ADJUSTMENT and OPNAME are
 * legacy/diagnostic types that remain in historical data but are not written
 * by new executable posting.
 */
export const MOVEMENT_TYPES = [
  'PURCHASE',
  'PRODUCTION_CONSUME',
  'PRODUCTION_RESULT',
  'SALE',
  'SALE_RETURN',
  'RETURN',
  'TRANSFER_OUT',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
  'ADJUSTMENT_OUT',
  'ADJUSTMENT',
  'OPNAME',
  'EXPIRED',
] as const
export type MovementType = (typeof MOVEMENT_TYPES)[number]

/** Indonesian display labels for each movement type. */
export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  PURCHASE: 'Pembelian',
  PRODUCTION_CONSUME: 'Konsumsi Produksi',
  PRODUCTION_RESULT: 'Hasil Produksi',
  SALE: 'Penjualan',
  SALE_RETURN: 'Retur Penjualan',
  RETURN: 'Retur Pembelian',
  TRANSFER_OUT: 'Transfer Keluar',
  TRANSFER_IN: 'Transfer Masuk',
  ADJUSTMENT_IN: 'Penyesuaian Masuk',
  ADJUSTMENT_OUT: 'Penyesuaian Keluar',
  ADJUSTMENT: 'Penyesuaian (legacy)',
  OPNAME: 'Stock Opname (legacy)',
  EXPIRED: 'Kedaluwarsa',
}

/** Movement types that increase stock (inbound). */
const INBOUND_MOVEMENT_TYPES: ReadonlySet<string> = new Set<string>([
  'PURCHASE',
  'PRODUCTION_RESULT',
  'SALE_RETURN',
  'TRANSFER_IN',
  'ADJUSTMENT_IN',
])

/** Movement types that decrease stock (outbound). */
const OUTBOUND_MOVEMENT_TYPES: ReadonlySet<string> = new Set<string>([
  'PRODUCTION_CONSUME',
  'SALE',
  'RETURN',
  'TRANSFER_OUT',
  'ADJUSTMENT_OUT',
  'EXPIRED',
])

/** Movement types that are legacy/diagnostic only (direction not asserted). */
const LEGACY_MOVEMENT_TYPES: ReadonlySet<string> = new Set<string>(['ADJUSTMENT', 'OPNAME'])

export type MovementDirection = 'INBOUND' | 'OUTBOUND' | 'LEGACY'

/** True when the movement type increases stock. */
export function isInboundMovementType(type: string): boolean {
  return INBOUND_MOVEMENT_TYPES.has(type)
}

/** True when the movement type decreases stock. */
export function isOutboundMovementType(type: string): boolean {
  return OUTBOUND_MOVEMENT_TYPES.has(type)
}

/** Classify a movement type as inbound / outbound / legacy for display. */
export function movementDirection(type: string): MovementDirection {
  if (INBOUND_MOVEMENT_TYPES.has(type)) {
    return 'INBOUND'
  }
  if (OUTBOUND_MOVEMENT_TYPES.has(type)) {
    return 'OUTBOUND'
  }
  if (LEGACY_MOVEMENT_TYPES.has(type)) {
    return 'LEGACY'
  }
  // Unknown types are shown neutrally (legacy styling) rather than failing.
  return 'LEGACY'
}

/** Human label for a movement type; falls back to the raw code if unknown. */
export function movementTypeLabel(type: string): string {
  return MOVEMENT_TYPE_LABELS[type as MovementType] ?? type
}

/**
 * A single Stock Ledger row: a RAW `InventoryMovement` as returned by the
 * backend. It carries IDs only (no joined names); the view resolves product and
 * outlet names from one-time lookup maps. `qty` is a positive magnitude; the
 * movement type determines the direction.
 */
export interface InventoryMovementRow {
  id: string
  outletId: string
  productId: string
  batchId: string
  movementType: string
  qty: number
  beforeQty: number
  afterQty: number
  sourceDocumentType: string | null
  sourceDocumentId: string | null
  notes: string | null
  userId: string | null
  createdAt: string
}

export interface LedgerListParams {
  page: number
  limit: number
  outletId?: string
  productId?: string
  batchId?: string
  movementType?: string
  /** Inclusive WIB calendar-date bounds (YYYY-MM-DD), interpreted by the backend. */
  dateFrom?: string
  dateTo?: string
}

export interface LedgerListResult {
  items: InventoryMovementRow[]
  meta: ListMeta
}

function toLedgerQuery(params: LedgerListParams): Record<string, string | number> {
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
  if (params.batchId) {
    query.batchId = params.batchId
  }
  if (params.movementType) {
    query.movementType = params.movementType
  }
  if (params.dateFrom) {
    query.dateFrom = params.dateFrom
  }
  if (params.dateTo) {
    query.dateTo = params.dateTo
  }
  return query
}

/** Batch status codes shared by stored status and backend-derived operational status. */
export const BATCH_STATUSES = ['ACTIVE', 'EXPIRED', 'CONSUMED', 'QUARANTINE'] as const
export type BatchStatus = (typeof BATCH_STATUSES)[number]

/** Indonesian display labels for the operational status shown on batch screens. */
const OPERATIONAL_STATUS_LABELS: Record<BatchStatus, string> = {
  ACTIVE: 'Aktif',
  EXPIRED: 'Kedaluwarsa — tidak dapat digunakan',
  CONSUMED: 'Habis',
  QUARANTINE: 'Karantina — tidak dapat digunakan',
}

/** Human label for backend-derived operational status, not stored batch status. */
export function operationalStatusLabel(status: string): string {
  return OPERATIONAL_STATUS_LABELS[status as BatchStatus] ?? status
}

/**
 * Expiry classification for a batch, derived entirely by the backend
 * (expiring-soon = within 30 days; non-batch or null expiry = NOT_APPLICABLE).
 * The frontend must NOT recompute this — it displays the backend value.
 */
export const EXPIRY_STATES = ['EXPIRED', 'EXPIRING_SOON', 'OK', 'NOT_APPLICABLE'] as const
export type ExpiryState = (typeof EXPIRY_STATES)[number]

/** Indonesian display labels for each expiry state. */
export const EXPIRY_STATE_LABELS: Record<ExpiryState, string> = {
  EXPIRED: 'Kedaluwarsa',
  EXPIRING_SOON: 'Segera Kedaluwarsa',
  OK: 'Aman',
  NOT_APPLICABLE: 'Tidak Berlaku',
}

/** Human label for an expiry state; falls back to the raw code if unknown. */
export function expiryStateLabel(state: string): string {
  return EXPIRY_STATE_LABELS[state as ExpiryState] ?? state
}

/**
 * A single `InventoryBatch` as returned by the backend. Carries IDs only (no
 * joined names); the view resolves outlet/product names from one-time lookup
 * maps. `batchNumber` is `''` for synthetic non-batch rows (`isNonBatch`).
 * `expiredDate` / `receivedDate` are ISO date strings (date-only) or null.
 */
export interface InventoryBatchRow {
  id: string
  companyId: string
  outletId: string
  productId: string
  batchNumber: string
  lotKey: string
  lotNumber: string | null
  expiredDate: string | null
  receivedDate: string | null
  qtyAvailable: number
  status: BatchStatus
  isNonBatch: boolean
}

/** A batch with backend-derived expiry and operational status for list/detail. */
export interface BatchWithExpiry {
  batch: InventoryBatchRow
  expiryState: ExpiryState
  operationalStatus: BatchStatus
}

export interface BatchesListParams {
  page: number
  limit: number
  outletId?: string
  productId?: string
  /** Filter by stored batch status (legacy callers). */
  status?: string
  operationalStatus?: string
  /**
   * When `true`, include synthetic non-batch rows. Sent as the string `'true'`;
   * omitted when false/undefined so the default list keeps its contract.
   */
  includeNonBatch?: boolean
}

export interface BatchesListResult {
  items: BatchWithExpiry[]
  meta: ListMeta
}

function toBatchesQuery(params: BatchesListParams): Record<string, string | number> {
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
  if (params.operationalStatus) {
    query.operationalStatus = params.operationalStatus
  }
  if (params.includeNonBatch) {
    query.includeNonBatch = 'true'
  }
  return query
}

interface ApiItemResponse<T> {
  success: true
  data: T
}

export const inventoryService = {
  async getStockOnHand(params: StockOnHandListParams): Promise<StockOnHandListResult> {
    const response = await httpClient.get<ApiListResponse<StockOnHandRow>>(
      '/inventory/stock-on-hand',
      { params: toStockOnHandQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },

  async getLedger(params: LedgerListParams): Promise<LedgerListResult> {
    const response = await httpClient.get<ApiListResponse<InventoryMovementRow>>(
      '/inventory/ledger',
      { params: toLedgerQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },

  async getBatches(params: BatchesListParams): Promise<BatchesListResult> {
    const response = await httpClient.get<ApiListResponse<BatchWithExpiry>>('/inventory/batches', {
      params: toBatchesQuery(params),
    })
    return { items: response.data.data, meta: response.data.meta }
  },

  async getBatchById(id: string): Promise<BatchWithExpiry> {
    const response = await httpClient.get<ApiItemResponse<BatchWithExpiry>>(
      `/inventory/batches/${id}`,
    )
    return response.data.data
  },
}
