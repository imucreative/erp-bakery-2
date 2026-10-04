/**
 * useShifts — list state (pagination, status + outlet filters) for the Shift
 * list page, plus an `findOpenShift` helper used by the POS terminal to resolve
 * the active OPEN shift for a chosen outlet. Mirrors useStockTransfers for the
 * list part; the open-shift lookup is a thin wrapper over the service.
 *
 * Errors are normalized through `toMessage` (reused from useStockLedger).
 */

import { computed, ref, watch } from 'vue'
import { toMessage } from '@/composables/useStockLedger'
import {
  salesService,
  type Shift,
  type ShiftListParams,
  type ShiftStatus,
} from '@/services/sales.service'

// Re-export so the POS terminal can import the normalizer directly.
export { toMessage }

const DEFAULT_LIMIT = 10

export interface ShiftListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ShiftStatusFilter = 'all' | ShiftStatus

export function useShifts() {
  const items = ref<Shift[]>([])
  const meta = ref<ShiftListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const statusFilter = ref<ShiftStatusFilter>('all')
  const outletFilter = ref<string>('')
  const page = ref<number>(1)

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: ShiftListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        outletId: outletFilter.value || undefined,
      }
      const result = await salesService.shifts.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  watch([statusFilter, outletFilter], () => {
    page.value = 1
    void fetchList()
  })

  function prevPage(): void {
    if (canPrev.value) {
      page.value -= 1
      void fetchList()
    }
  }

  function nextPage(): void {
    if (canNext.value) {
      page.value += 1
      void fetchList()
    }
  }

  /**
   * Resolve the current OPEN shift for an outlet (first match or null). Used by
   * the POS terminal to decide whether to show the terminal or the open-shift
   * CTA. Returns null on empty outletId.
   */
  async function findOpenShift(outletId: string): Promise<Shift | null> {
    if (!outletId) {
      return null
    }
    const result = await salesService.shifts.list({
      page: 1,
      limit: 1,
      status: 'OPEN',
      outletId,
    })
    return result.items[0] ?? null
  }

  return {
    items,
    meta,
    loading,
    errorMessage,
    statusFilter,
    outletFilter,
    page,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    findOpenShift,
    toMessage,
  }
}
