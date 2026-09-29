/**
 * Dashboard service — real inventory metrics.
 * Verified against backend inventory.controller.ts `GET /inventory/dashboard`
 * (permission inventory.read, optional `outletId` query) → InventoryDashboardSummary.
 *
 * NOTE: revenue/sales metrics require the Sales module (not built yet), so the
 * dashboard shows real inventory figures and marks sales cards as pending.
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

export interface InventoryDashboardSummary {
  totalActiveBatches: number
  totalProductsInStock: number
  lowStockCount: number
  expiringSoonCount: number
  expiredCount: number
  inTransitTransfers: number
}

export const dashboardService = {
  /** Read-only inventory dashboard summary (optionally scoped to an outlet). */
  async getInventorySummary(outletId?: string): Promise<InventoryDashboardSummary> {
    const response = await httpClient.get<ApiSuccess<InventoryDashboardSummary>>(
      '/inventory/dashboard',
      { params: outletId ? { outletId } : undefined },
    )
    return response.data.data
  },
}
