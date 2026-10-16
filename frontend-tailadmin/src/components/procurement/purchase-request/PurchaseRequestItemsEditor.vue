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
import { Plus, Trash2 } from 'lucide-vue-next'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
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
    <BaseTable aria-label="Editor item purchase request">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead>Qty</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead>Estimasi Harga</BaseTableHead>
          <BaseTableHead align="end">Subtotal</BaseTableHead>
          <BaseTableHead align="end">Aksi</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="(row, index) in modelValue" :key="index">
          <!-- Product — text autocomplete, client-filtered -->
          <BaseTableCell class="align-top">
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
          </BaseTableCell>
          <!-- Quantity -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-request-quantity-${index}`"
              :model-value="row.quantity"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { quantity: Number($event) })"
            />
          </BaseTableCell>
          <!-- UOM -->
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`purchase-request-uom-${index}`"
              :model-value="row.uomId"
              :options="uomOptionsForRow(row).map((u) => ({ value: u.id, label: u.label }))"
              placeholder="Pilih UOM"
              :disabled="disabled"
              @update:model-value="updateRow(index, { uomId: $event })"
            />
            <span
              v-if="row.productId && validUoms.isLoading(row.productId)"
              class="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500"
            >
              Memuat satuan...
            </span>
          </BaseTableCell>
          <!-- Estimated Price -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-request-price-${index}`"
              :model-value="row.estimatedPrice"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { estimatedPrice: Number($event) })"
            />
          </BaseTableCell>
          <!-- Subtotal (preview, read-only) -->
          <BaseTableCell align="end" class="align-middle">
            {{ formatRupiah(subtotal(row)) }}
          </BaseTableCell>
          <!-- Remove -->
          <BaseTableCell align="end" class="align-middle">
            <BaseButton
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus baris"
              title="Hapus baris"
              :disabled="disabled"
              @click="removeRow(index)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </BaseTableCell>
        </BaseTableRow>

        <BaseTableRow v-if="modelValue.length === 0">
          <BaseTableCell colspan="6" align="center">
            Belum ada item. Tambahkan minimal satu item.
          </BaseTableCell>
        </BaseTableRow>
      </template>
      <template v-if="modelValue.length > 0" #footer>
        <BaseTableRow>
          <BaseTableCell colspan="4" align="end" emphasis="medium">Total Estimasi</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">
            {{ formatRupiah(grandTotal) }}
          </BaseTableCell>
          <BaseTableCell />
        </BaseTableRow>
      </template>
    </BaseTable>

    <BaseButton v-if="!disabled" variant="outline" @click="addRow">
      <template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
      Tambah Item
    </BaseButton>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Subtotal & total di atas hanya pratinjau; nilai final dihitung oleh server.
    </p>
  </div>
</template>
