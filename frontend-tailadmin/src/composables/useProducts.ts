/**
 * useProducts — product list state + CRUD, plus the relation option sets
 * (product groups, categories, UOMs, suppliers) and id→name maps used by the
 * table and the create form's cascading dropdowns.
 */

import { computed, ref, watch } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  productService,
  type Product,
  type CreateProductPayload,
  type UpdateProductPayload,
  type ProductListParams,
} from '@/services/product.service'
import { productGroupService, type ProductGroup } from '@/services/product-group.service'
import { categoryService, type Category } from '@/services/category.service'
import { uomService, type Uom } from '@/services/uom.service'
import { supplierService, type Supplier } from '@/services/supplier.service'

const DEFAULT_LIMIT = 10
const SEARCH_DEBOUNCE_MS = 350
const OPTION_LIMIT = 100

export interface ProductListMeta {
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

function nameMap<T extends { id: string; name: string }>(rows: T[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const r of rows) {
    map[r.id] = r.name
  }
  return map
}

export function useProducts() {
  const items = ref<Product[]>([])
  const meta = ref<ProductListMeta>({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 0 })
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  const search = ref<string>('')
  const debouncedSearch = ref<string>('')
  const page = ref<number>(1)
  let searchTimer: ReturnType<typeof setTimeout> | undefined

  // Relation option sets (loaded lazily once).
  const groups = ref<ProductGroup[]>([])
  const categories = ref<Category[]>([])
  const uoms = ref<Uom[]>([])
  const suppliers = ref<Supplier[]>([])
  const optionsLoaded = ref<boolean>(false)

  const groupNameById = computed(() => nameMap(groups.value))
  const categoryNameById = computed(() => nameMap(categories.value))
  const uomNameById = computed(() => nameMap(uoms.value))
  const supplierNameById = computed(() => nameMap(suppliers.value))

  const totalPages = computed<number>(() => meta.value.totalPages || 1)
  const canPrev = computed<boolean>(() => page.value > 1)
  const canNext = computed<boolean>(() => page.value < totalPages.value)

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      const params: ProductListParams = {
        page: page.value,
        limit: DEFAULT_LIMIT,
        search: debouncedSearch.value || undefined,
      }
      const result = await productService.list(params)
      items.value = result.items
      meta.value = result.meta
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  /** Loads active groups/categories/uoms/suppliers once for dropdowns + name maps. */
  async function ensureOptions(): Promise<void> {
    if (optionsLoaded.value) {
      return
    }
    try {
      const [g, c, u, s] = await Promise.all([
        productGroupService.list({ page: 1, limit: OPTION_LIMIT, isActive: 'true' }),
        categoryService.list({ page: 1, limit: OPTION_LIMIT, isActive: 'true' }),
        uomService.list({ page: 1, limit: OPTION_LIMIT, isActive: 'true' }),
        supplierService.list({ page: 1, limit: OPTION_LIMIT, isActive: 'true' }),
      ])
      groups.value = g.items
      categories.value = c.items
      uoms.value = u.items
      suppliers.value = s.items
      optionsLoaded.value = true
    } catch {
      // Non-fatal: dropdowns will be empty; table will fall back to ids.
    }
  }

  /** Categories filtered by the selected product group (for cascading dropdown). */
  function categoriesForGroup(productGroupId: string): Category[] {
    if (!productGroupId) {
      return []
    }
    return categories.value.filter((c) => c.productGroupId === productGroupId)
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

  async function createProduct(payload: CreateProductPayload): Promise<void> {
    await productService.create(payload)
    await fetchList()
  }

  async function updateProduct(id: string, payload: UpdateProductPayload): Promise<void> {
    await productService.update(id, payload)
    await fetchList()
  }

  async function deleteProduct(id: string): Promise<void> {
    await productService.remove(id)
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
    categories,
    uoms,
    suppliers,
    groupNameById,
    categoryNameById,
    uomNameById,
    supplierNameById,
    ensureOptions,
    categoriesForGroup,
    fetchList,
    prevPage,
    nextPage,
    createProduct,
    updateProduct,
    deleteProduct,
    toMessage,
  }
}
