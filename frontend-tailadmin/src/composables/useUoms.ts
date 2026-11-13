/**
 * useUoms — encapsulates all UOM list state and CRUD actions so the view stays
 * thin. Owns pagination, debounced search, and the create/update/delete flows;
 * surfaces loading/error state and normalized messages.
 */

import { computed, ref, watch } from 'vue'
import { uomService, type Uom, type UomListParams } from '@/services/uom.service'
import type { CreateUomPayload, UpdateUomPayload } from '@/services/uom.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface UomListMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

import { toMessage } from '@/lib/errors'

export function useUoms() {
  const items = ref<Uom[]>([])
  const meta = ref<UomListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
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
      const params: UomListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await uomService.list(params)
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

  async function createUom(payload: CreateUomPayload): Promise<void> {
    await uomService.create(payload)
    await fetchList()
  }

  async function updateUom(id: string, payload: UpdateUomPayload): Promise<void> {
    await uomService.update(id, payload)
    await fetchList()
  }

  async function deleteUom(id: string): Promise<void> {
    await uomService.remove(id)
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
    page,
    totalPages,
    canPrev,
    canNext,
    fetchList,
    prevPage,
    nextPage,
    createUom,
    updateUom,
    deleteUom,
    toMessage,
  }
}
