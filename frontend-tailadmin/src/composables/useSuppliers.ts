/**
 * useSuppliers — encapsulates supplier list state + CRUD actions so the view
 * stays thin. Mirrors the useUoms pattern (pagination, debounced search,
 * create/update/delete, normalized error messages).
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  supplierService,
  type Supplier,
  type CreateSupplierPayload,
  type UpdateSupplierPayload,
  type SupplierListParams,
} from '@/services/supplier.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface SupplierListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useSuppliers() {
  const items = ref<Supplier[]>([])
  const meta = ref<SupplierListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: SupplierListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await supplierService.list(params)
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

  async function createSupplier(payload: CreateSupplierPayload): Promise<void> {
    await supplierService.create(payload)
    await fetchList()
  }

  async function updateSupplier(id: string, payload: UpdateSupplierPayload): Promise<void> {
    await supplierService.update(id, payload)
    await fetchList()
  }

  async function deleteSupplier(id: string): Promise<void> {
    await supplierService.remove(id)
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
    page,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    toMessage,
  }
}
