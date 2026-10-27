/**
 * Reports service — Sales, Inventory, and Production reports.
 * Verified against backend reports.controller.ts:
 * - GET /reports/sales → SalesReport
 * - GET /reports/inventory → InventoryReport
 * - GET /reports/production → ProductionReport
 * - GET /reports/[type]/export → CSV download
 */

import { httpClient } from './http'

interface ApiSuccess<T> {
  success: true
  message?: string
  data: T
}

// ─── Sales Report Types ─────────────────────────────────────────────────────

export interface SalesReportSummary {
  totalOrders: number
  totalRevenue: number
  averageOrderValue: number
  totalItemsSold: number
}

export interface SalesReportDailyBreakdown {
  date: string
  outletId: string
  outletName: string
  orderCount: number
  revenue: number
  itemsSold: number
}

export interface SalesReportTopProduct {
  productId: string
  productName: string
  toppingNames: string[]
  qtySold: number
  revenue: number
}

export interface SalesReport {
  summary: SalesReportSummary
  details: SalesReportDailyBreakdown[]
  topProducts: SalesReportTopProduct[]
}

export type SalesReportTopProductsLimit = 5 | 10 | 20 | 50

export interface SalesReportFilters {
  dateFrom: string
  dateTo: string
  outletId: string
  status: 'PAID' | 'REFUNDED' | 'CANCELLED'
  topProductsLimit: SalesReportTopProductsLimit
}

// ─── Inventory Report Types ─────────────────────────────────────────────────

export interface InventoryReportSummary {
  totalProducts: number
  totalBatches: number
  totalStockValue: number
  lowStockCount: number
  expiredCount: number
}

export interface InventoryReportProductRow {
  productId: string
  productName: string
  sku: string
  totalQty: number
  availableQty: number
  reservedQty: number
  batchCount: number
  earliestExpiry: string | null
  stockValue: number
}

export interface InventoryReport {
  summary: InventoryReportSummary
  details: InventoryReportProductRow[]
}

export interface InventoryReportFilters {
  outletId: string
  productId: string
  includeExpired: boolean
}

// ─── Production Report Types ────────────────────────────────────────────────

export interface ProductionReportSummary {
  totalOrders: number
  totalProduced: number
  totalWaste: number
  averageYield: number
}

export interface ProductionReportDailyBreakdown {
  date: string
  outletId: string
  outletName: string
  recipeId: string
  recipeName: string
  plannedQty: number
  producedQty: number
  wasteQty: number
  yield: number
}

export interface ProductionReport {
  summary: ProductionReportSummary
  details: ProductionReportDailyBreakdown[]
}

export interface ProductionReportFilters {
  dateFrom: string
  dateTo: string
  outletId: string
  recipeId: string
}

// ─── Service ────────────────────────────────────────────────────────────────

export const reportsService = {
  /** Sales report with date range and outlet filters. */
  async getSalesReport(filters: SalesReportFilters): Promise<SalesReport> {
    const response = await httpClient.get<ApiSuccess<SalesReport>>('/reports/sales', {
      params: filters,
    })
    return response.data.data
  },

  /** Inventory report with outlet and product filters. */
  async getInventoryReport(filters: InventoryReportFilters): Promise<InventoryReport> {
    const response = await httpClient.get<ApiSuccess<InventoryReport>>('/reports/inventory', {
      params: filters,
    })
    return response.data.data
  },

  /** Production report with date range, outlet, and recipe filters. */
  async getProductionReport(filters: ProductionReportFilters): Promise<ProductionReport> {
    const response = await httpClient.get<ApiSuccess<ProductionReport>>('/reports/production', {
      params: filters,
    })
    return response.data.data
  },

  /** Export sales report to CSV (downloads file). */
  async exportSalesReport(filters: SalesReportFilters): Promise<void> {
    const response = await httpClient.get('/reports/sales/export', {
      params: filters,
      responseType: 'blob',
    })
    downloadBlob(response.data, `sales-report-${filters.dateFrom}-to-${filters.dateTo}.csv`)
  },

  /** Export inventory report to CSV (downloads file). */
  async exportInventoryReport(filters: InventoryReportFilters): Promise<void> {
    const response = await httpClient.get('/reports/inventory/export', {
      params: filters,
      responseType: 'blob',
    })
    const date = new Date().toISOString().slice(0, 10)
    downloadBlob(response.data, `inventory-report-${date}.csv`)
  },

  /** Export production report to CSV (downloads file). */
  async exportProductionReport(filters: ProductionReportFilters): Promise<void> {
    const response = await httpClient.get('/reports/production/export', {
      params: filters,
      responseType: 'blob',
    })
    downloadBlob(response.data, `production-report-${filters.dateFrom}-to-${filters.dateTo}.csv`)
  },
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}
