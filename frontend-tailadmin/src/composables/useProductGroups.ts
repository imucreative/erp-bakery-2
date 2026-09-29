/**
 * useProductGroups — encapsulates product-group list state + CRUD actions.
 * Mirrors the useUoms / useSuppliers pattern.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  productGroupService,
  type ProductGroup,
  type CreateProductGroupPayload,
  type UpdateProductGroupPayload,
  type ProductGroupListParams,
} from '@/services/product-group.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350

export interface ProductGroupListMeta {
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

export function useProductGroups() {
  const items = ref<ProductGroup[]>([])
  const meta = ref<ProductGroupListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
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
      const params: ProductGroupListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await productGroupService.list(params)
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

  async function createGroup(payload: CreateProductGroupPayload): Promise<void> {
    await productGroupService.create(payload)
    await fetchList()
  }

  async function updateGroup(id: string, payload: UpdateProductGroupPayload): Promise<void> {
    await productGroupService.update(id, payload)
    await fetchList()
  }

  async function deleteGroup(id: string): Promise<void> {
    await productGroupService.remove(id)
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
    createGroup,
    updateGroup,
    deleteGroup,
    toMessage,
  }
}
