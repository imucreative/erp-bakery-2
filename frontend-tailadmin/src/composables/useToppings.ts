/**
 * useToppings — encapsulates the GLOBAL topping catalog list state and CRUD so
 * the view stays thin. The backend `GET /toppings` returns the full catalog as
 * a plain array (no pagination), so search is applied client-side; the catalog
 * is small by design. Also loads the topping-eligible product options
 * (RAW_MATERIAL + SEMI_FINISHED) used by the create form's product dropdown,
 * excluding products already registered as a topping.
 */

import { computed, ref } from 'vue'
import { ApiClientError } from '@/services/http'
import {
  toppingService,
  type Topping,
  type CreateToppingPayload,
  type UpdateToppingPayload,
} from '@/services/topping.service'
import { productService, type Product } from '@/services/product.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

function toMessage(error: unknown): string {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }
  return 'Terjadi kesalahan. Coba lagi.'
}

export function useToppings() {
  const all = ref<Topping[]>([])
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const search = ref<string>('')

  // Topping-eligible products (RAW_MATERIAL + SEMI_FINISHED), loaded lazily once
  // for the create form dropdown. The backend rejects other product types.
  const toppingProducts = ref<Product[]>([])
  const toppingProductsLoaded = ref<boolean>(false)

  // Client-side filter + sort (sortOrder asc, then name) over the full catalog.
  const items = computed<Topping[]>(() => {
    const term = search.value.trim().toLowerCase()
    const rows = term
      ? all.value.filter(
          (t) =>
            t.toppingName.toLowerCase().includes(term) ||
            t.toppingSku.toLowerCase().includes(term),
        )
      : all.value
    return [...rows].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.toppingName.localeCompare(b.toppingName),
    )
  })

  const total = computed<number>(() => all.value.length)

  // Product ids already used as a topping — excluded from the create dropdown.
  const usedProductIds = computed<Set<string>>(
    () => new Set(all.value.map((t) => t.toppingProductId)),
  )

  /** Topping-eligible products not yet registered as a topping (for create). */
  const availableToppingProducts = computed<Product[]>(() =>
    toppingProducts.value.filter((p) => !usedProductIds.value.has(p.id)),
  )

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      all.value = await toppingService.list()
    } catch (error) {
      errorMessage.value = toMessage(error)
      all.value = []
    } finally {
      loading.value = false
    }
  }

  /**
   * Loads all active topping-eligible products (RAW_MATERIAL + SEMI_FINISHED)
   * once, for the create form's product dropdown.
   */
  async function ensureToppingProducts(): Promise<void> {
    if (toppingProductsLoaded.value) {
      return
    }
    try {
      const [raw, semi] = await Promise.all([
        fetchAllPaginated<Product>(async (p) => {
          const result = await productService.list({
            page: p,
            limit: PAGE_LIMIT,
            productType: 'RAW_MATERIAL',
            isActive: 'true',
          })
          return { items: result.items, meta: result.meta }
        }),
        fetchAllPaginated<Product>(async (p) => {
          const result = await productService.list({
            page: p,
            limit: PAGE_LIMIT,
            productType: 'SEMI_FINISHED',
            isActive: 'true',
          })
          return { items: result.items, meta: result.meta }
        }),
      ])
      toppingProducts.value = [...raw, ...semi]
      toppingProductsLoaded.value = true
    } catch {
      // Non-fatal: dropdown will be empty.
    }
  }

  async function createTopping(payload: CreateToppingPayload): Promise<void> {
    await toppingService.create(payload)
    await fetchList()
  }

  async function updateTopping(id: string, payload: UpdateToppingPayload): Promise<void> {
    await toppingService.update(id, payload)
    await fetchList()
  }

  async function deleteTopping(id: string): Promise<void> {
    await toppingService.remove(id)
    await fetchList()
  }

  return {
    items,
    total,
    loading,
    errorMessage,
    search,
    toppingProducts,
    availableToppingProducts,
    ensureToppingProducts,
    fetchList,
    createTopping,
    updateTopping,
    deleteTopping,
    toMessage,
  }
}
