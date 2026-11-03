/**
 * useBatches — list state (pagination, outlet filter, product filter, batch
 * status filter, include-non-batch toggle) for the read-only Batch & Expiry
 * list page. Mirrors useStockLedger: the view owns handlers only; this
 * composable owns reads. Batch & Expiry is read-only — no mutations.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  inventoryService,
  type BatchesListParams,
  type BatchWithExpiry,
} from '@/services/inventory.service'

const DEFAULT_LIMIT = 10

export interface BatchListMeta {
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

export function useBatches() {
  const items = ref<BatchWithExpiry[]>([])
  const meta = ref<BatchListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const outletId = ref<string>('')
  const productId = ref<string>('')
  const status = ref<string>('')
  const includeNonBatch = ref<boolean>(false)
  const page = ref<number>(1)
  const limit = ref<number>(DEFAULT_LIMIT)

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: BatchesListParams = {
        page: page.value,
        limit: limit.value,
        outletId: outletId.value || undefined,
        productId: productId.value || undefined,
        operationalStatus: status.value || undefined,
        includeNonBatch: includeNonBatch.value || undefined,
      }
      const result = await inventoryService.getBatches(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  watch(outletId, () => {
    page.value = 1
    void fetchList()
  })

  watch(productId, () => {
    page.value = 1
    void fetchList()
  })

  watch(status, () => {
    page.value = 1
    void fetchList()
  })

  watch(includeNonBatch, () => {
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
    outletId,
    productId,
    status,
    includeNonBatch,
    page,
    limit,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    toMessage,
  }
}
