/**
 * Dashboard service — Owner, Outlet, and Inventory dashboards.
 * Verified against backend dashboard.controller.ts:
 * - GET /dashboard/owner?outletId={id} → OwnerDashboardSummary (outletId optional)
 * - GET /dashboard/outlet?outletId={id} → OutletDashboardSummary
 * - GET /inventory/dashboard → InventoryDashboardSummary (legacy, still used)
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

export interface SalesTrendPoint {
  date: string
  revenue: number
  orderCount: number
}

export interface ExpiringBatch {
  productId: string
  productName: string
  batchNo: string
  expiryDate: string
  qty: number
  uomName: string
}

export interface TopSellingProduct {
  productId: string
  productName: string
  toppingNames: string[]
  qtySold: number
  revenue: number
}

export interface OwnerDashboardSummary {
  revenueToday: number
  salesToday: number
  lowStockCount: number
  expiredCount: number
  salesTrend: SalesTrendPoint[]
  expiringSoon: ExpiringBatch[]
  topProducts: TopSellingProduct[]
}

export const OWNER_DASHBOARD_PERIOD_OPTIONS = [7, 14, 30, 90] as const
export const OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS = [5, 10, 20, 50] as const

export type OwnerDashboardPeriodDays = (typeof OWNER_DASHBOARD_PERIOD_OPTIONS)[number]
export type OwnerDashboardTopProductsLimit =
  (typeof OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS)[number]

export interface OwnerDashboardFilters {
  outletId?: string
  periodDays: OwnerDashboardPeriodDays
  topProductsLimit: OwnerDashboardTopProductsLimit
}

export interface OutletDashboardSummary {
  outletId: string
  outletName: string
  salesToday: number
  revenueToday: number
  lowStockCount: number
  pendingRequests: number
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

  /** Owner dashboard — business metrics, company-wide or scoped to one outlet. */
  async getOwnerSummary(filters: OwnerDashboardFilters): Promise<OwnerDashboardSummary> {
    const response = await httpClient.get<ApiSuccess<OwnerDashboardSummary>>('/dashboard/owner', {
      params: {
        ...(filters.outletId ? { outletId: filters.outletId } : {}),
        periodDays: filters.periodDays,
        topProductsLimit: filters.topProductsLimit,
      },
    })
    return response.data.data
  },

  /** Outlet dashboard — metrics scoped to a single outlet. */
  async getOutletSummary(outletId: string): Promise<OutletDashboardSummary> {
    const response = await httpClient.get<ApiSuccess<OutletDashboardSummary>>('/dashboard/outlet', {
      params: { outletId },
    })
    return response.data.data
  },
}
