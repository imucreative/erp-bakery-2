/**
 * useStockOnHand — list state (pagination, debounced search by product
 * name/SKU, outlet filter, low-stock-only toggle) for the Stock On Hand list
 * page. Mirrors the list composable pattern (usePurchaseRequests): the view
 * owns handlers only; this composable owns reads. Stock On Hand is read-only,
 * so there are no mutation actions here.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  inventoryService,
  type StockOnHandRow,
  type StockOnHandListParams,
} from '@/services/inventory.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface StockOnHandListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

/** Normalize an unknown error into a user-facing message. */
export function toMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const details = error.fieldErrors
      .map((item) => item.message)
      .filter((message): message is string => Boolean(message))
    if (details.length > 0) {
      return `${error.message}: ${details.join('; ')}`
    }
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useStockOnHand() {
  const items = ref<StockOnHandRow[]>([])
  const meta = ref<StockOnHandListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const outletId = ref<string>('')
  const lowOnly = ref<boolean>(false)
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: StockOnHandListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
        outletId: outletId.value || undefined,
        lowOnly: lowOnly.value ? true : undefined,
      }
      const result = await inventoryService.getStockOnHand(params)
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

  watch(outletId, () => {
    page.value = 1
    void fetchList()
  })

  watch(lowOnly, () => {
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
    outletId,
    lowOnly,
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
