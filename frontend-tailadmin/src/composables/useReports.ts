/**
 * useReports — composables for Sales, Inventory, and Production reports.
 * Manages report state, filters, loading, and export functionality.
 */

import { ref } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  reportsService,
  type SalesReport,
  type SalesReportFilters,
  type InventoryReport,
  type InventoryReportFilters,
  type ProductionReport,
  type ProductionReportFilters,
} from '@/services/reports.service'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useSalesReport() {
  const report = ref<SalesReport | null>(null)
  const filters = ref<SalesReportFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    outletId: '',
    status: 'PAID',
    topProductsLimit: 10,
  })
  const appliedTopProductsLimit = ref<SalesReportFilters['topProductsLimit']>(
    filters.value.topProductsLimit,
  )
  const loading = ref<boolean>(false)
  const exporting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function loadReport(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      report.value = await reportsService.getSalesReport(filters.value)
      appliedTopProductsLimit.value = filters.value.topProductsLimit
    } catch (error) {
      errorMessage.value = toMessage(error)
      report.value = null
    } finally {
      loading.value = false
    }
  }

  async function exportReport(): Promise<void> {
    exporting.value = true
    errorMessage.value = null
    try {
      await reportsService.exportSalesReport(filters.value)
    } catch (error) {
      errorMessage.value = toMessage(error)
    } finally {
      exporting.value = false
    }
  }

  return {
    report,
    filters,
    appliedTopProductsLimit,
    loading,
    exporting,
    errorMessage,
    loadReport,
    exportReport,
  }
}

export function useInventoryReport() {
  const report = ref<InventoryReport | null>(null)
  const filters = ref<InventoryReportFilters>({
    outletId: '',
    productId: '',
    includeExpired: false,
  })
  const loading = ref<boolean>(false)
  const exporting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function loadReport(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      report.value = await reportsService.getInventoryReport(filters.value)
    } catch (error) {
      errorMessage.value = toMessage(error)
      report.value = null
    } finally {
      loading.value = false
    }
  }

  async function exportReport(): Promise<void> {
    exporting.value = true
    errorMessage.value = null
    try {
      await reportsService.exportInventoryReport(filters.value)
    } catch (error) {
      errorMessage.value = toMessage(error)
    } finally {
      exporting.value = false
    }
  }

  return { report, filters, loading, exporting, errorMessage, loadReport, exportReport }
}

export function useProductionReport() {
  const report = ref<ProductionReport | null>(null)
  const filters = ref<ProductionReportFilters>({
    dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    outletId: '',
    recipeId: '',
  })
  const loading = ref<boolean>(false)
  const exporting = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function loadReport(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      report.value = await reportsService.getProductionReport(filters.value)
    } catch (error) {
      errorMessage.value = toMessage(error)
      report.value = null
    } finally {
      loading.value = false
    }
  }

  async function exportReport(): Promise<void> {
    exporting.value = true
    errorMessage.value = null
    try {
      await reportsService.exportProductionReport(filters.value)
    } catch (error) {
      errorMessage.value = toMessage(error)
    } finally {
      exporting.value = false
    }
  }

  return { report, filters, loading, exporting, errorMessage, loadReport, exportReport }
}
