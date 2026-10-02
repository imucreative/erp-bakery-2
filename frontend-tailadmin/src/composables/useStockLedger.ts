/**
 * useStockLedger — list state (pagination, outlet filter, product filter,
 * movement-type filter) for the read-only Stock Ledger list page. Mirrors
 * useStockOnHand: the view owns handlers only; this composable owns reads. The
 * ledger has no backend `search` param, so none is sent. `batchId` is supported
 * by the backend contract but is not exposed in the MVP UI; it is kept here as
 * optional state for future use. Stock Ledger is read-only — no mutations.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  inventoryService,
  type InventoryMovementRow,
  type LedgerListParams,
} from '@/services/inventory.service'

const DEFAULT_LIMIT = 10

export interface StockLedgerListMeta {
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

export function useStockLedger() {
  const items = ref<InventoryMovementRow[]>([])
  const meta = ref<StockLedgerListMeta>({
    page: 1,
    limit: DEFAULT_LIMIT,
    total: 0,
    totalPages: 0,
  })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const outletId = ref<string>('')
  const productId = ref<string>('')
  const batchId = ref<string>('')
  const movementType = ref<string>('')
  const page = ref<number>(1)

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: LedgerListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        outletId: outletId.value || undefined,
        productId: productId.value || undefined,
        batchId: batchId.value || undefined,
        movementType: movementType.value || undefined,
      }
      const result = await inventoryService.getLedger(params)
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

  watch(movementType, () => {
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
    batchId,
    movementType,
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
