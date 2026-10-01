/**
 * usePurchaseOrders — list state (pagination, debounced search by poNumber,
 * status + supplier filters) for the Purchase Order list page. Mirrors the
 * usePurchaseRequests pattern. Mutations/lifecycle actions live on the
 * detail/form views via the service directly; this composable owns list reads.
 *
 * Errors are normalized through `toMessage` (reused from usePurchaseRequests),
 * which surfaces backend `fieldErrors` alongside the top-level message.
 */

import { computed, ref, watch } from 'vue'
import { toMessage } from '@/composables/usePurchaseRequests'
import {
  purchaseOrderService,
  type PurchaseOrder,
  type PurchaseOrderListParams,
  type PurchaseOrderStatus,
} from '@/services/purchase-order.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface PurchaseOrderListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type StatusFilter = 'all' | PurchaseOrderStatus

export function usePurchaseOrders() {
  const items = ref<PurchaseOrder[]>([])
  const meta = ref<PurchaseOrderListMeta>({
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
  const supplierFilter = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: PurchaseOrderListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        supplierId: supplierFilter.value || undefined,
      }
      const result = await purchaseOrderService.list(params)
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

  watch([statusFilter, supplierFilter], () => {
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
    supplierFilter,
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
