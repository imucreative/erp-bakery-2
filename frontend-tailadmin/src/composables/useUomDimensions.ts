/**
 * useUomDimensions — master-data state for the global UOM dimension catalog.
 *
 * Loads active + inactive rows (the management page needs both), filters
 * client-side because the reference table is small, and owns create/update/
 * delete flows. Forms elsewhere only need the active list and call
 * `uomDimensionService.list()` directly.
 */
import { computed, ref } from 'vue'
import {
  uomDimensionService,
  type CreateUomDimensionPayload,
  type UomDimensionDefinition,
  type UpdateUomDimensionPayload,
} from '@/services/uom-dimension.service'
import { toMessage } from '@/lib/errors'

export function useUomDimensions() {
  const items = ref<UomDimensionDefinition[]>([])
  const loading = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)
  const search = ref<string>('')

  const filteredItems = computed<UomDimensionDefinition[]>(() => {
    const query = search.value.trim().toLowerCase()
    if (!query) {
      return items.value
    }
    return items.value.filter(
      (dimension) =>
        dimension.code.toLowerCase().includes(query) ||
        dimension.name.toLowerCase().includes(query) ||
        dimension.canonicalUnitName.toLowerCase().includes(query) ||
        dimension.canonicalUnitSymbol.toLowerCase().includes(query),
    )
  })

  async function fetchList(): Promise<void> {
    loading.value = true
    errorMessage.value = null
    try {
      items.value = await uomDimensionService.list({ includeInactive: true })
    } catch (error) {
      errorMessage.value = toMessage(error)
      items.value = []
    } finally {
      loading.value = false
    }
  }

  async function createDimension(
    payload: CreateUomDimensionPayload,
  ): Promise<UomDimensionDefinition> {
    const created = await uomDimensionService.create(payload)
    await fetchList()
    return created
  }

  async function updateDimension(code: string, payload: UpdateUomDimensionPayload): Promise<void> {
    await uomDimensionService.update(code, payload)
    await fetchList()
  }

  async function deleteDimension(code: string): Promise<void> {
    await uomDimensionService.remove(code)
    await fetchList()
  }

  return {
    items,
    filteredItems,
    loading,
    errorMessage,
    search,
    fetchList,
    createDimension,
    updateDimension,
    deleteDimension,
    toMessage,
  }
}
