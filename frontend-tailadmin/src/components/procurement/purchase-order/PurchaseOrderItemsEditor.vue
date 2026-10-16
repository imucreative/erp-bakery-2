<script setup lang="ts">
/**
 * PurchaseOrderItemsEditor — PR-locked line-items grid for the PO form.
 *
 * Business rule (backend-authoritative, mirrored here for UX): a PO's items may
 * ONLY come from the items of its source Purchase Request. Specifically:
 *   1. Product is NOT free-choice — each row's product is dictated by a source
 *      PR item. No foreign products, no duplicate products.
 *   2. A SUBSET of the PR items is allowed (the user may drop some rows).
 *   3. Quantity per row may be ≤ the matching PR item's OUTSTANDING (remaining)
 *      quota across active POs; never more (the `max` and local validation
 *      enforce this). Default from the outstanding quota.
 *   4. UOM is restricted to the product's VALID units — its base unit plus any
 *      ACTIVE registered conversions (loaded on demand per product, cached);
 *      default from the PR item. A product with no conversions offers only its
 *      base unit. The product lock from (1) is unaffected. See
 *      `useProductValidUoms`.
 *   5. Unit price is free (default from the PR estimatedPrice); Tax % is free
 *      (default 0).
 *
 * Because of (1), the Product column is READ-ONLY (a label, not a catalog
 * select) and there is no free "Add Item" button. Rows start prefilled from the
 * PR by the parent. Users exclude a row with the per-row remove button, and can
 * re-add a previously removed PR item through the "Tambah dari item PR"
 * dropdown — which only lists outstanding PR items not already present (so
 * duplicates are impossible and it is empty once every outstanding item is in
 * the table).
 *
 * Preview (UI only, server authoritative):
 *   subtotal = quantity * unitPrice
 *   tax      = subtotal * taxPercent / 100
 *   total    = subtotal + tax
 */
import { computed, onMounted, watch } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
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
  unitPrice: number
  taxPercent: number
}

/**
 * A source PR item used to constrain the editor. Supplies the allowed product,
 * the maximum quantity, and the defaults applied when a dropped item is re-added.
 *
 * `quantity` is the OUTSTANDING (remaining) PR quota across active POs — the
 * authoritative per-row cap — not the raw PR quantity. The parent builds this
 * list from `GET /purchase-orders/outstanding` and only includes items whose
 * outstanding quota is > 0, so every entry here is orderable.
 */
export interface SourcePrItem {
  productId: string
  quantity: number
  uomId: string
  estimatedPrice: number
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  /** Items of the source PR — the only products allowed in this PO. */
  prItems: SourcePrItem[]
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

/** Fast lookup of the source PR item per product (allowed product + max qty). */
const prItemMap = computed<Map<string, SourcePrItem>>(
  () => new Map(props.prItems.map((item) => [item.productId, item])),
)

/** Human label for a row's product (name + SKU) with graceful fallbacks. */
function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  if (!product) {
    return productId || '—'
  }
  return `${product.name} (${product.sku})`
}

/**
 * The matching PR item's outstanding (remaining) quota, used as the per-row
 * max. `prItems` carries the outstanding amount in `quantity`. 0 → no cap.
 */
function maxQtyForRow(row: EditorItemRow): number {
  return prItemMap.value.get(row.productId)?.quantity ?? 0
}

/**
 * PR items not yet present in the editor — the only choices for the "add"
 * dropdown. Prevents duplicate products and is empty once all PR items are in.
 */
const addableItems = computed<SourcePrItem[]>(() => {
  const used = new Set(props.modelValue.map((row) => row.productId))
  return props.prItems.filter((item) => !used.has(item.productId))
})

/**
 * Per-product valid UOMs (base + active conversions), loaded on demand and
 * cached by productId. The resolver draws the base unit from the already-loaded
 * product/uom maps so no extra wiring is needed. The PR→PO product lock is
 * unaffected: products stay read-only; only the UOM choices are scoped here.
 */
const validUoms = useProductValidUoms({
  baseUomId: (productId) => productMap.value.get(productId)?.uomId ?? '',
  baseUomLabel: (uomId) => uomMap.value.get(uomId)?.name ?? 'UOM dasar',
})

/**
 * Load conversions for every product present in the rows (rows start prefilled
 * from the PR), and keep loading as rows are re-added. `ensureLoaded` is
 * idempotent and de-duplicates across rows sharing a product, so this never
 * N+1s.
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
 * valid units (e.g. its stored UOM/conversion was deactivated), a synthetic
 * "(saat ini)"/"(nonaktif)" option is appended so the select shows the current
 * selection instead of rendering blank.
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
  const price = Number(row.unitPrice) || 0
  return qty * price
}

function taxAmount(row: EditorItemRow): number {
  const percent = Number(row.taxPercent) || 0
  return (subtotal(row) * percent) / 100
}

function rowTotal(row: EditorItemRow): number {
  return subtotal(row) + taxAmount(row)
}

const subtotalSum = computed<number>(() =>
  props.modelValue.reduce((sum, row) => sum + subtotal(row), 0),
)
const taxSum = computed<number>(() =>
  props.modelValue.reduce((sum, row) => sum + taxAmount(row), 0),
)
const grandTotal = computed<number>(() => subtotalSum.value + taxSum.value)

function emitRows(rows: EditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/** Add a dropped PR item back as a row, prefilled with its PR defaults. */
function onAddFromPr(productId: string): void {
  if (!productId) {
    return
  }
  const prItem = prItemMap.value.get(productId)
  if (!prItem) {
    return
  }
  // Load the product's valid UOMs (base + active conversions) for the new row.
  void validUoms.ensureLoaded(productId)
  emitRows([
    ...props.modelValue,
    {
      productId: prItem.productId,
      quantity: prItem.quantity,
      uomId: prItem.uomId,
      unitPrice: prItem.estimatedPrice,
      taxPercent: 0,
    },
  ])
}

function removeRow(index: number): void {
  emitRows(props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="space-y-3">
    <BaseTable aria-label="Editor item purchase order">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead>Qty</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead>Harga Satuan</BaseTableHead>
          <BaseTableHead>Pajak %</BaseTableHead>
          <BaseTableHead align="end">Total</BaseTableHead>
          <BaseTableHead align="end">Aksi</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow
          v-for="(row, index) in modelValue"
          :key="row.productId || index"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <!-- Product (read-only — dictated by the source PR item) -->
          <BaseTableCell class="align-top">
            <div class="flex min-h-11 flex-col justify-center">
              <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ productLabel(row.productId) }}
              </span>
              <span class="text-theme-xs text-gray-400 dark:text-gray-500"> Dari item PR </span>
            </div>
          </BaseTableCell>
          <!-- Quantity (capped at the matching PR item quantity) -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-order-quantity-${index}`"
              :model-value="row.quantity"
              type="number"
              min="0"
              :max="maxQtyForRow(row) || undefined"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { quantity: Number($event) })"
            />
            <span
              v-if="maxQtyForRow(row) > 0"
              class="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500"
            >
              Maks {{ maxQtyForRow(row) }} (sisa PR)
            </span>
          </BaseTableCell>
          <!-- UOM -->
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`purchase-order-uom-${index}`"
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
          <!-- Unit Price -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-order-price-${index}`"
              :model-value="row.unitPrice"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { unitPrice: Number($event) })"
            />
          </BaseTableCell>
          <!-- Tax % -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-order-tax-${index}`"
              :model-value="row.taxPercent"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { taxPercent: Number($event) })"
            />
          </BaseTableCell>
          <!-- Total (preview, read-only) -->
          <BaseTableCell align="end" class="align-middle">
            {{ formatRupiah(rowTotal(row)) }}
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
          <BaseTableCell colspan="7" align="center">
            <template v-if="prItems.length === 0">
              Pilih PR sumber untuk memuat item yang masih tersisa (outstanding).
            </template>
            <template v-else> Belum ada item. Tambahkan dari item PR di bawah. </template>
          </BaseTableCell>
        </BaseTableRow>
      </template>
      <template v-if="modelValue.length > 0" #footer>
        <BaseTableRow>
          <BaseTableCell colspan="5" align="end" emphasis="medium">Subtotal</BaseTableCell>
          <BaseTableCell align="end">
            {{ formatRupiah(subtotalSum) }}
          </BaseTableCell>
          <BaseTableCell />
        </BaseTableRow>
        <BaseTableRow>
          <BaseTableCell colspan="5" align="end" emphasis="medium">Pajak</BaseTableCell>
          <BaseTableCell align="end">
            {{ formatRupiah(taxSum) }}
          </BaseTableCell>
          <BaseTableCell />
        </BaseTableRow>
        <BaseTableRow>
          <BaseTableCell colspan="5" align="end" emphasis="medium">Grand Total</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">
            {{ formatRupiah(grandTotal) }}
          </BaseTableCell>
          <BaseTableCell />
        </BaseTableRow>
      </template>
    </BaseTable>

    <!-- Add from PR items — only items not already in the table; never a product catalog -->
    <div v-if="!disabled && addableItems.length > 0" class="flex items-center gap-2">
      <div class="relative w-full max-w-xs">
        <BaseSelect
          id="purchase-order-add-item"
          model-value=""
          :options="
            addableItems.map((item) => ({
              value: item.productId,
              label: productLabel(item.productId),
            }))
          "
          placeholder="Tambah dari item PR..."
          aria-label="Tambah dari item PR"
          @update:model-value="onAddFromPr($event)"
        >
        </BaseSelect>
      </div>
      <Plus class="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Item hanya dapat dipilih dari item PR sumber. Kuantitas tidak boleh melebihi sisa
      (outstanding) PR setelah dikurangi PO lain yang masih aktif. Subtotal, pajak & total di atas
      hanya pratinjau; nilai final dihitung oleh server.
    </p>
  </div>
</template>
