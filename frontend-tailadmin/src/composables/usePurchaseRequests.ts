/**
 * usePurchaseRequests — list state (pagination, debounced search by prNumber,
 * status filter) for the Purchase Request list page. Mirrors the master-data
 * composable pattern (usePaymentTerms). Mutations/lifecycle actions live on the
 * detail/form views via the service directly; this composable owns list reads.
 *
 * Errors are normalized to a message (surfaces backend 409 invalid-transition
 * and 400 validation through the same channel).
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  purchaseRequestService,
  type PurchaseRequest,
  type PurchaseRequestListParams,
  type PurchaseRequestStatus,
} from '@/services/purchase-request.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface PurchaseRequestListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type StatusFilter = 'all' | PurchaseRequestStatus

export function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function usePurchaseRequests() {
  const items = ref<PurchaseRequest[]>([])
  const meta = ref<PurchaseRequestListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const statusFilter = ref<StatusFilter>('all')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: PurchaseRequestListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      }
      const result = await purchaseRequestService.list(params)
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

  watch(statusFilter, () => {
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
