/**
 * useDashboard — loads Owner, Outlet, and Inventory dashboard summaries.
 * Exposes loading/error + the summary for each dashboard type.
 */

import { ref } from 'vue'
import {
  dashboardService,
  type InventoryDashboardSummary,
  type OwnerDashboardFilters,
  type OwnerDashboardSummary,
  type OutletDashboardSummary,
} from '@/services/dashboard.service'

import { toMessage } from '@/lib/errors'

export function useDashboard() {
  const summary = ref<InventoryDashboardSummary | null>(null)
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function load(outletId?: string): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      summary.value = await dashboardService.getInventorySummary(outletId)
    } catch (error) {
      errorMessage.value = toMessage(error)
      summary.value = null
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, errorMessage, load }
}

export function useOwnerDashboard() {
  const summary = ref<OwnerDashboardSummary | null>(null)
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function load(filters: OwnerDashboardFilters): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      summary.value = await dashboardService.getOwnerSummary(filters)
    } catch (error) {
      errorMessage.value = toMessage(error)
      summary.value = null
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, errorMessage, load }
}

export function useOutletDashboard(outletId: string) {
  const summary = ref<OutletDashboardSummary | null>(null)
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      summary.value = await dashboardService.getOutletSummary(outletId)
    } catch (error) {
      errorMessage.value = toMessage(error)
      summary.value = null
    } finally {
      loading.value = false
    }
  }

  return { summary, loading, errorMessage, load }
}
