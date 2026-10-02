/**
 * Inventory service — read-only inventory views (company/tenant-scoped).
 *
 *  - GET /inventory/stock-on-hand → { success, data: StockOnHandRow[], meta } (paginated)
 *      guard: inventory.read
 *      filters: page, limit, outletId?, productId?, search? (name/SKU), lowOnly? ('true')
 *
 * Stock-On-Hand is the canonical read view of current inventory: `qtyAvailable`
 * is the summed balance of active batches (doc 35 §8). This is a read-only
 * module — there are no create/update/lifecycle actions.
 *
 * This file is designed to grow: the upcoming Stock Ledger (GET
 * /inventory/movements) and Batch & Expiry (GET /inventory/batches) views will
 * add `getLedger` / `getBatches` methods here, reusing the same list envelope
 * and `toStockOnHandQuery`-style param builders. Those are NOT implemented yet.
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

function toStockOnHandQuery(
  params: StockOnHandListParams,
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
  if (params.search) {
    query.search = params.search
  }
  if (params.lowOnly) {
    query.lowOnly = 'true'
  }
  return query
}

export const inventoryService = {
  async getStockOnHand(
    params: StockOnHandListParams,
  ): Promise<StockOnHandListResult> {
    const response = await httpClient.get<ApiListResponse<StockOnHandRow>>(
      '/inventory/stock-on-hand',
      { params: toStockOnHandQuery(params) },
    )
    return { items: response.data.data, meta: response.data.meta }
  },
}
