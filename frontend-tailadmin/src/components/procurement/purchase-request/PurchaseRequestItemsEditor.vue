<script setup lang="ts">
/**
 * PurchaseRequestItemsEditor — editable line-items grid for the PR form.
 *
 * Each row: Product (select, filtered to active products), Quantity (>0),
 * UOM (auto-filled from the product; falls back to a select if the product has
 * no UOM), Estimated Price (>=0), Subtotal (UI preview = quantity * price,
 * read-only; the server is authoritative). Add/remove rows; at least one row is
 * expected (enforced by the parent on submit).
 *
 * Two-way binds the rows array via v-model. Selecting a product auto-fills the
 * row's UOM and pre-fills the estimated price from the product's purchasePrice
 * when the price is still zero (convenience only; the user may override).
 *
 * UOM scope: the UOM select for a row is restricted to that product's VALID
 * units — its base unit plus any ACTIVE registered conversions (loaded on
 * demand per product and cached). A product with no conversions offers only its
 * base unit. See `useProductValidUoms`.
 */
import { computed, onMounted, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { PlusIcon } from '@/icons'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { formatRupiah } from '@/lib/format'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'
import { useProductValidUoms } from '@/composables/useProductValidUoms'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface EditorItemRow {
  productId: string
  quantity: number
  uomId: string
  estimatedPrice: number
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  products: Product[]
  uoms: Uom[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', rows: EditorItemRow[]): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

const productMap = computed<Map<string, Product>>(
  () => new Map(props.products.map((p) => [p.id, p])),
)
const uomMap = computed<Map<string, Uom>>(() => new Map(props.uoms.map((u) => [u.id, u])))

/**
 * Per-product valid UOMs (base + active conversions), loaded on demand and
 * cached by productId. The resolver draws the base unit from the already-loaded
 * product/uom maps so no extra wiring is needed.
 */
const validUoms = useProductValidUoms({
  baseUomId: (productId) => productMap.value.get(productId)?.uomId ?? '',
  baseUomLabel: (uomId) => uomMap.value.get(uomId)?.name ?? 'UOM dasar',
})

/**
 * Load conversions for every product already present in the rows (edit mode),
 * then keep them loaded as rows gain products. `ensureLoaded` is idempotent and
 * de-duplicates across rows that share a product, so this never N+1s.
 */
onMounted(() => {
  for (const row of props.modelValue) {
    if (row.productId) {
      void validUoms.ensureLoaded(row.productId)
    }
  }
})
watch(
  () => props.modelValue.map((row) => row.productId),
  (productIds) => {
    for (const productId of productIds) {
      if (productId) {
        void validUoms.ensureLoaded(productId)
      }
    }
  },
)

/**
 * The UOM options to render for a given row: the product's VALID units (base +
 * active conversions). If the row already holds a `uomId` that is NOT among the
 * valid units (e.g. the product changed, or its stored UOM/conversion was
 * deactivated), a synthetic "(nonaktif)" option is appended so the select shows
 * the current selection instead of rendering blank. Mirrors the payment-term
 * pattern in SupplierFormModal.
 */
function uomOptionsForRow(row: EditorItemRow): Array<{ id: string; label: string }> {
  const options = validUoms.validUoms(row.productId).map((option) => ({ ...option }))
  if (row.uomId && !options.some((option) => option.id === row.uomId)) {
    const stored = uomMap.value.get(row.uomId)
    const label = stored ? `${stored.name} (saat ini)` : 'UOM saat ini (nonaktif)'
    options.push({ id: row.uomId, label })
  }
  return options
}

function subtotal(row: EditorItemRow): number {
  const qty = Number(row.quantity) || 0
  const price = Number(row.estimatedPrice) || 0
  return qty * price
}

const grandTotal = computed<number>(() =>
  props.modelValue.reduce((sum, row) => sum + subtotal(row), 0),
)

function emitRows(rows: EditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/**
 * Product picked in this row's combobox. Carries over every behaviour the old
 * native <select> had:
 *   - load the newly chosen product's valid UOMs (base + active conversions)
 *   - derive uomId from the selected product
 *   - pre-fill the estimated price when the row has none yet
 * `EntityCombobox` also emits `update:modelValue`, but this component is a
 * controlled child that persists rows through the single `update:modelValue`
 * emit, so the row is written here instead.
 */
function onProductSelect(index: number, product: Product): void {
  const current = props.modelValue[index]
  void validUoms.ensureLoaded(product.id)
  // Always derive uomId from the selected product. A product always carries a
  // uomId in the contract, so we set it unconditionally (even when it points to
  // a now-inactive UOM absent from the loaded list — the value is still a valid
  // UUID and stays visible via the synthetic option).
  const patch: Partial<EditorItemRow> = {
    productId: product.id,
    uomId: product.uomId ?? '',
  }
  // Pre-fill estimated price from the product's purchase price only when the
  // row's price hasn't been set yet (don't clobber a user-entered value).
  if (!current || Number(current.estimatedPrice) === 0) {
    patch.estimatedPrice = product.purchasePrice ?? 0
  }
  updateRow(index, patch)
}

function addRow(): void {
  emitRows([...props.modelValue, { productId: '', quantity: 1, uomId: '', estimatedPrice: 0 }])
}

function removeRow(index: number): void {
  emitRows(props.modelValue.filter((_, i) => i !== index))
}

/** Ids picked by any row; a row's own id is excluded by the adapter below. */
const usedProductIds = computed<Set<string>>(
  () => new Set(props.modelValue.map((row) => row.productId).filter(Boolean)),
)

/**
 * An item is blocked when another row already picked the same product. Comparing
 * against the row's own id keeps the current choice re-selectable.
 */
function makeBlockedTest(index: number): (product: Product) => boolean {
  const ownId = props.modelValue[index]?.productId
  const used = usedProductIds.value
  return (product: Product) => product.id !== ownId && used.has(product.id)
}

const sortedProducts = computed<Product[]>(() =>
  [...props.products].sort((a, b) => a.name.localeCompare(b.name)),
)

/**
 * Clear the product. The row's UOM is reset ONLY when it still equals the removed
 * product's base UOM (i.e. it was the auto-default) — a UOM the user picked by
 * hand is preserved.
 */
function clearItemProduct(index: number): void {
  const row = props.modelValue[index]
  const previous = row ? productMap.value.get(row.productId) : undefined
  const patch: Partial<EditorItemRow> = { productId: '' }
  if (row && row.uomId && previous && row.uomId === previous.uomId) {
    patch.uomId = ''
  }
  updateRow(index, patch)
}

function labelValue(product: Product): string {
  return `${product.name} (${product.sku})`
}

/** Display text of an already-chosen product, falling back to its id. */
function chosenLabel(row: EditorItemRow): string {
  const product = productMap.value.get(row.productId)
  return product ? labelValue(product) : row.productId
}
</script>

<template>
  <div class="space-y-3">
    <!-- Horizontal scroll only. The height follows the row count, and
         `overflow-y-hidden` keeps this wrapper from ever becoming a vertical
         scroll container (CSS computes overflow-y to auto once overflow-x is set). -->
    <div class="overflow-x-auto overflow-y-hidden rounded-xl border border-gray-200 dark:border-gray-800">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="w-36 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Estimasi Harga
            </th>
            <th class="w-40 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Subtotal
            </th>
            <th class="w-16 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="index"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <!-- Product — text autocomplete, client-filtered -->
            <td class="px-4 py-3 align-top">
              <EntityCombobox
                :model-value="row.productId"
                :selected-label="chosenLabel(row)"
                :items="sortedProducts"
                :item-id="(product) => product.id"
                :item-label="labelValue"
                :item-disabled="makeBlockedTest(index)"
                item-disabled-hint="sudah dipakai di baris lain"
                mode="client"
                :max-suggestions="50"
                :visible-item-count="10"
                placeholder="Ketik untuk mencari produk..."
                empty-text="Produk tidak ditemukan."
                :aria-label="`Produk baris ${index + 1}`"
                :clear-aria-label="`Hapus produk baris ${index + 1}`"
                :disabled="disabled"
                @select="onProductSelect(index, $event)"
                @clear="clearItemProduct(index)"
              />
            </td>
            <!-- Quantity -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.quantity"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { quantity: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- UOM -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.uomId"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="updateRow(index, { uomId: ($event.target as HTMLSelectElement).value })"
                >
                  <option value="" disabled>Pilih UOM</option>
                  <option v-for="u in uomOptionsForRow(row)" :key="u.id" :value="u.id">
                    {{ u.label }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
              <span
                v-if="row.productId && validUoms.isLoading(row.productId)"
                class="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500"
              >
                Memuat satuan...
              </span>
            </td>
            <!-- Estimated Price -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.estimatedPrice"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { estimatedPrice: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- Subtotal (preview, read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-700 dark:text-gray-300">
              {{ formatRupiah(subtotal(row)) }}
            </td>
            <!-- Remove -->
            <td class="px-4 py-3 text-end align-middle">
              <button
                type="button"
                aria-label="Hapus baris"
                title="Hapus baris"
                :disabled="disabled"
                class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 hover:text-error-600 disabled:cursor-not-allowed disabled:opacity-40 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                @click="removeRow(index)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </button>
            </td>
          </tr>

          <tr v-if="modelValue.length === 0">
            <td
              colspan="6"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Belum ada item. Tambahkan minimal satu item.
            </td>
          </tr>
        </tbody>
        <tfoot v-if="modelValue.length > 0">
          <tr class="border-t border-gray-200 dark:border-gray-800">
            <td
              colspan="4"
              class="px-4 py-3 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Total Estimasi
            </td>
            <td class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ formatRupiah(grandTotal) }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <button
      v-if="!disabled"
      type="button"
      class="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:border-brand-300 hover:text-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500/50"
      @click="addRow"
    >
      <PlusIcon class="h-4 w-4" aria-hidden="true" />
      Tambah Item
    </button>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Subtotal & total di atas hanya pratinjau; nilai final dihitung oleh server.
    </p>
  </div>
</template>
