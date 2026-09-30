/**
 * useOutlets — encapsulates outlet list state + CRUD actions so the view stays
 * thin. Mirrors the useSuppliers pattern (pagination, debounced search,
 * create/update/delete, normalized error messages incl. 409 on delete).
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  outletService,
  type Outlet,
  type CreateOutletPayload,
  type UpdateOutletPayload,
  type OutletListParams,
} from '@/services/outlet.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface OutletListMeta {
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

export function useOutlets() {
  const items = ref<Outlet[]>([])
  const meta = ref<OutletListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
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
      const params: OutletListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await outletService.list(params)
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

  async function createOutlet(payload: CreateOutletPayload): Promise<void> {
    await outletService.create(payload)
    await fetchList()
  }

  async function updateOutlet(id: string, payload: UpdateOutletPayload): Promise<void> {
    await outletService.update(id, payload)
    await fetchList()
  }

  async function deleteOutlet(id: string): Promise<void> {
    await outletService.remove(id)
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
    createOutlet,
    updateOutlet,
    deleteOutlet,
    toMessage,
  }
}
