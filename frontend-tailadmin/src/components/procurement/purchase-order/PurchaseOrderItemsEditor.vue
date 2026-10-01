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
 *   4. UOM is free-choice (default from the PR item).
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
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { PlusIcon } from '@/icons'
import { formatRupiah } from '@/lib/format'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

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
 * The UOM options to render for a given row. Starts from the loaded (active)
 * UOM list, then — if the row already holds a `uomId` that is NOT in that list
 * (e.g. the product's UOM was deactivated) — appends a synthetic "(nonaktif)"
 * option so the select shows the current, valid selection instead of blank.
 */
function uomOptionsForRow(row: EditorItemRow): Array<{ id: string; label: string }> {
  const options = props.uoms.map((u) => ({ id: u.id, label: u.name }))
  if (row.uomId && !uomMap.value.has(row.uomId)) {
    const product = productMap.value.get(row.productId)
    const base = product ? `UOM ${product.name}` : 'UOM saat ini'
    options.push({ id: row.uomId, label: `${base} (nonaktif)` })
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
    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="w-36 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Harga Satuan
            </th>
            <th class="w-24 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Pajak %
            </th>
            <th class="w-40 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Total
            </th>
            <th class="w-16 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="row.productId || index"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <!-- Product (read-only — dictated by the source PR item) -->
            <td class="px-4 py-3 align-top">
              <div class="flex min-h-11 flex-col justify-center">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ productLabel(row.productId) }}
                </span>
                <span class="text-theme-xs text-gray-400 dark:text-gray-500">
                  Dari item PR
                </span>
              </div>
            </td>
            <!-- Quantity (capped at the matching PR item quantity) -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.quantity"
                type="number"
                min="0"
                :max="maxQtyForRow(row) || undefined"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { quantity: Number(($event.target as HTMLInputElement).value) })"
              />
              <span
                v-if="maxQtyForRow(row) > 0"
                class="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500"
              >
                Maks {{ maxQtyForRow(row) }} (sisa PR)
              </span>
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
            </td>
            <!-- Unit Price -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.unitPrice"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { unitPrice: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- Tax % -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.taxPercent"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { taxPercent: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- Total (preview, read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-700 dark:text-gray-300">
              {{ formatRupiah(rowTotal(row)) }}
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
              colspan="7"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              <template v-if="prItems.length === 0">
                Pilih PR sumber untuk memuat item yang masih tersisa (outstanding).
              </template>
              <template v-else>
                Belum ada item. Tambahkan dari item PR di bawah.
              </template>
            </td>
          </tr>
        </tbody>
        <tfoot v-if="modelValue.length > 0">
          <tr class="border-t border-gray-100 dark:border-gray-800">
            <td
              colspan="5"
              class="px-4 py-2 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Subtotal
            </td>
            <td class="px-4 py-2 text-end text-theme-sm text-gray-700 dark:text-gray-300">
              {{ formatRupiah(subtotalSum) }}
            </td>
            <td></td>
          </tr>
          <tr>
            <td
              colspan="5"
              class="px-4 py-2 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300"
            >
              Pajak
            </td>
            <td class="px-4 py-2 text-end text-theme-sm text-gray-700 dark:text-gray-300">
              {{ formatRupiah(taxSum) }}
            </td>
            <td></td>
          </tr>
          <tr class="border-t border-gray-200 dark:border-gray-800">
            <td
              colspan="5"
              class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-700 dark:text-gray-200"
            >
              Grand Total
            </td>
            <td class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-800 dark:text-white/90">
              {{ formatRupiah(grandTotal) }}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- Add from PR items — only items not already in the table; never a product catalog -->
    <div v-if="!disabled && addableItems.length > 0" class="flex items-center gap-2">
      <div class="relative w-full max-w-xs">
        <select
          value=""
          :class="[inputClass, 'appearance-none pe-10']"
          aria-label="Tambah dari item PR"
          @change="onAddFromPr(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
        >
          <option value="" disabled>Tambah dari item PR...</option>
          <option v-for="item in addableItems" :key="item.productId" :value="item.productId">
            {{ productLabel(item.productId) }}
          </option>
        </select>
        <ChevronDownIcon
          class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
        />
      </div>
      <PlusIcon class="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Item hanya dapat dipilih dari item PR sumber. Kuantitas tidak boleh melebihi
      sisa (outstanding) PR setelah dikurangi PO lain yang masih aktif.
      Subtotal, pajak & total di atas hanya pratinjau; nilai final dihitung oleh server.
    </p>
  </div>
</template>
