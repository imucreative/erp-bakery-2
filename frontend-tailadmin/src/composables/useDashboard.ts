/**
 * useDashboard — loads the real inventory dashboard summary. Optional outlet
 * scope (used by the outlet dashboard). Exposes loading/error + the summary.
 */

import { ref } from 'vue'
import { ApiClientError } from '@/services/http'
import { dashboardService, type InventoryDashboardSummary } from '@/services/dashboard.service'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

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
