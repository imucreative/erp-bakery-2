/**
 * useProductTypes — master-data state for the product-type catalog.
 *
 * Loads active + inactive rows (the management page needs both), filters
 * client-side because the reference table is small, and owns create/update/
 * delete flows. The product form keeps using `productTypeService.list()` directly
 * for the active-only dropdown.
 */
import { computed, ref } from 'vue'
import {
  productTypeService,
  type CreateProductTypePayload,
  type ProductTypeOption,
  type UpdateProductTypePayload,
} from '@/services/product-type.service'
import { toMessage } from '@/lib/errors'

export function useProductTypes() {
  const items = ref<ProductTypeOption[]>([])
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const search = ref<string>('')

  const filteredItems = computed<ProductTypeOption[]>(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) {
      return items.value
    }
    return items.value.filter(
      (type) =>
        type.code.toLowerCase().includes(query) ||
        type.name.toLowerCase().includes(query) ||
        (type.description ?? '').toLowerCase().includes(query),
    )
  })

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      items.value = await productTypeService.list({ includeInactive: true })
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function createProductType(payload: CreateProductTypePayload): Promise<void> {
    await productTypeService.create(payload)
    await fetchList()
  }

  async function updateProductType(
    code: string,
    payload: UpdateProductTypePayload,
  ): Promise<void> {
    await productTypeService.update(code, payload)
    await fetchList()
  }

  async function deleteProductType(code: string): Promise<void> {
    await productTypeService.remove(code)
    await fetchList()
  }

  return {
    items,
    filteredItems,
    loading,
    errorMessage,
    search,
    fetchList,
    createProductType,
    updateProductType,
    deleteProductType,
    toMessage,
  }
}
