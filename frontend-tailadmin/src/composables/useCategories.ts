/**
 * useCategories — category list state + CRUD, plus product-group options for the
 * relation dropdown and an id→name map to render the group column. Mirrors the
 * established master-module composable pattern (useUoms/useSuppliers).
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  categoryService,
  type Category,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
  type CategoryListParams,
} from '@/services/category.service'
import { productGroupService, type ProductGroup } from '@/services/product-group.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350
// Product groups for the dropdown: fetch a generous page so a company's groups
// fit in one request (list endpoint caps limit at 100).
const GROUP_OPTIONS_LIMIT = 100

export interface CategoryListMeta {
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

export function useCategories() {
  const items = ref<Category[]>([])
  const meta = ref<CategoryListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  // Product group options (for dropdown) + id→name map (for the table column).
  const groups = ref<ProductGroup[]>([])
  const groupsLoaded = ref<boolean>(false)
  const groupNameById = computed<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const g of groups.value) {
      map[g.id] = g.name
    }
    return map
  })

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: CategoryListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await categoryService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /** Loads active product groups once, for the relation dropdown + name map. */
  async function ensureGroups(): Promise<void> {
    if (groupsLoaded.value) {
      return
    }
    try {
      const result = await productGroupService.list({
        page: 1,
        limit: GROUP_OPTIONS_LIMIT,
        isActive: 'true',
      })
      groups.value = result.items
      groupsLoaded.value = true
    } catch {
      // Non-fatal: dropdown will simply be empty and the table shows the id.
      groups.value = []
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

  async function createCategory(payload: CreateCategoryPayload): Promise<void> {
    await categoryService.create(payload)
    await fetchList()
  }

  async function updateCategory(id: string, payload: UpdateCategoryPayload): Promise<void> {
    await categoryService.update(id, payload)
    await fetchList()
  }

  async function deleteCategory(id: string): Promise<void> {
    await categoryService.remove(id)
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
    groups,
    groupNameById,
    ensureGroups,
    fetchList,
    prevPage,
    nextPage,
    createCategory,
    updateCategory,
    deleteCategory,
    toMessage,
  }
}
