/**
 * usePaymentTerms — encapsulates payment term list state + CRUD actions so the
 * view stays thin. Mirrors the useSuppliers/useUoms pattern (pagination,
 * debounced search, isActive filter, create/update/delete, normalized error
 * messages). Surfaces backend 409 responses (duplicate code, delete-in-use)
 * through the normalized message so the view can render them.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  paymentTermService,
  type PaymentTerm,
  type CreatePaymentTermPayload,
  type UpdatePaymentTermPayload,
  type PaymentTermListParams,
} from '@/services/payment-term.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface PaymentTermListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type ActiveFilter = 'all' | 'true' | 'false'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function usePaymentTerms() {
  const items = ref<PaymentTerm[]>([])
  const meta = ref<PaymentTermListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const activeFilter = ref<ActiveFilter>('all')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: PaymentTermListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
        isActive: activeFilter.value === 'all' ? undefined : activeFilter.value,
      }
      const result = await paymentTermService.list(params)
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

  watch(activeFilter, () => {
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

  async function createPaymentTerm(payload: CreatePaymentTermPayload): Promise<void> {
    await paymentTermService.create(payload)
    await fetchList()
  }

  async function updatePaymentTerm(id: string, payload: UpdatePaymentTermPayload): Promise<void> {
    await paymentTermService.update(id, payload)
    await fetchList()
  }

  async function deletePaymentTerm(id: string): Promise<void> {
    await paymentTermService.remove(id)
    // Step back a page if we just removed the last row on a non-first page.
    if (items.value.length === 1 && page.value > 1) {
      page.value -= 1
    }
    await fetchList()
  }

  return {
    items,
    meta,
    loading,
    errorMessage,
    search,
    activeFilter,
    page,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    createPaymentTerm,
    updatePaymentTerm,
    deletePaymentTerm,
    toMessage,
  }
}
