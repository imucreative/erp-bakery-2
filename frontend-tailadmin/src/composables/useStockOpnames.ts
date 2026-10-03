/**
 * useStockOpnames — list state (pagination, debounced search by
 * opnameNumber/notes, status + outlet filters) for the Stock Opname list page.
 * Mirrors useStockAdjustments: mutations/lifecycle actions live on the
 * detail/form views via the service directly; this composable owns list reads.
 *
 * Errors are normalized through `toMessage` (reused from useStockLedger), which
 * surfaces backend `fieldErrors` alongside the top-level message.
 */

import { computed, ref, watch } from 'vue'
import { toMessage } from '@/composables/useStockLedger'
import {
  stockOpnameService,
  type StockOpname,
  type StockOpnameListParams,
  type StockOpnameStatus,
} from '@/services/stock-opname.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface StockOpnameListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type OpnameStatusFilter = 'all' | StockOpnameStatus

export function useStockOpnames() {
  const items = ref<StockOpname[]>([])
  const meta = ref<StockOpnameListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const statusFilter = ref<OpnameStatusFilter>('all')
  const outletFilter = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: StockOpnameListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        outletId: outletFilter.value || undefined,
      }
      const result = await stockOpnameService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  watch(search, (value) => {
    if (searchTimer) {
      clearTimeout(searchTimer)
    }
    searchTimer = setTimeout(() => {
      debouncedSearch.value = value.trim()
      page.value = 1
      void fetchList()
    }, SEARCH_DEBOUNCE_MS)
  })

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

  return {
    items,
    meta,
    loading,
    errorMessage,
    search,
    statusFilter,
    outletFilter,
    page,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    toMessage,
  }
}
