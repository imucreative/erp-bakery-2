<script setup lang="ts">
/**
 * GoodsReceiptItemsEditor — PO-locked line-items grid for the GR form.
 *
 * Business rule (backend-authoritative, mirrored here for UX): a GR's items may
 * ONLY come from the items of its source Purchase Order, constrained to the
 * OUTSTANDING (remaining) quantity across GRs. Specifically:
 *   1. Product is NOT free-choice — each row's product/PO-item is dictated by a
 *      source PO outstanding item. No foreign products, no duplicate PO items.
 *   2. A SUBSET of the PO items is allowed (the user may drop some rows).
 *   3. `acceptedQuantity + rejectedQuantity ≤ outstandingQuantity` per row, and
 *      at least one of the two must be > 0 for an included item.
 *   4. For a batch-tracked product with `acceptedQuantity > 0`, `batchNumber`
 *      and `expiryDate` are required. Non-batch products: batch/expiry optional.
 *   5. UOM is free-choice (default from the PO item).
 *
 * Because of (1), the Product column is READ-ONLY (a label, not a catalog
 * select) and there is no free "Add Item" button. Rows start prefilled from the
 * PO outstanding set by the parent. Users exclude a row with the per-row remove
 * button, and can re-add a previously removed PO item through the "Tambah dari
 * item PO" dropdown — which only lists outstanding PO items not already present
 * (so duplicates are impossible and it is empty once every outstanding item is
 * in the table).
 */
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { PlusIcon } from '@/icons'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface EditorItemRow {
  purchaseOrderItemId: string
  productId: string
  acceptedQuantity: number
  rejectedQuantity: number
  uomId: string
  batchNumber: string
  lotNumber: string
  expiryDate: string
}

/**
 * A source PO outstanding item used to constrain the editor. Supplies the
 * allowed PO item/product, the ordered quantity (display), the maximum
 * (outstanding) quantity, and the UOM default applied when a dropped item is
 * re-added. `outstandingQuantity` is the authoritative per-row cap for
 * accepted + rejected.
 */
export interface SourcePoItem {
  purchaseOrderItemId: string
  productId: string
  orderedQuantity: number
  outstandingQuantity: number
  uomId: string
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  /** Outstanding items of the source PO — the only products allowed in this GR. */
  poItems: SourcePoItem[]
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

/** Fast lookup of the source PO outstanding item per PO-item id. */
const poItemMap = computed<Map<string, SourcePoItem>>(
  () => new Map(props.poItems.map((item) => [item.purchaseOrderItemId, item])),
)

/** Human label for a row's product (name + SKU) with graceful fallbacks. */
function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  if (!product) {
    return productId || '—'
  }
  return `${product.name} (${product.sku})`
}

/** True when the row's product is batch-tracked (batch + expiry become required). */
function isBatchTracked(productId: string): boolean {
  return productMap.value.get(productId)?.isBatchTracked ?? false
}

/** The matching PO item's ordered quantity (display only). */
function orderedForRow(row: EditorItemRow): number {
  return poItemMap.value.get(row.purchaseOrderItemId)?.orderedQuantity ?? 0
}

/** The matching PO item's outstanding (remaining) quota — the per-row max for accepted+rejected. */
function maxQtyForRow(row: EditorItemRow): number {
  return poItemMap.value.get(row.purchaseOrderItemId)?.outstandingQuantity ?? 0
}

/** accepted + rejected for a row (NaN-safe). */
function receivedForRow(row: EditorItemRow): number {
  return (Number(row.acceptedQuantity) || 0) + (Number(row.rejectedQuantity) || 0)
}

/** True when accepted + rejected exceeds the outstanding quota. */
function overMax(row: EditorItemRow): boolean {
  const max = maxQtyForRow(row)
  return max > 0 && receivedForRow(row) > max
}

/** True when a batch-tracked row with accepted > 0 is missing batch or expiry. */
function missingBatch(row: EditorItemRow): boolean {
  if (!isBatchTracked(row.productId)) {
    return false
  }
  if ((Number(row.acceptedQuantity) || 0) <= 0) {
    return false
  }
  return !row.batchNumber.trim() || !row.expiryDate
}

/**
 * PO outstanding items not yet present in the editor — the only choices for the
 * "add" dropdown. Prevents duplicate PO items and is empty once all are in.
 */
const addableItems = computed<SourcePoItem[]>(() => {
  const used = new Set(props.modelValue.map((row) => row.purchaseOrderItemId))
  return props.poItems.filter((item) => !used.has(item.purchaseOrderItemId))
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

function emitRows(rows: EditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/** Add a dropped PO item back as a row, prefilled with its PO defaults. */
function onAddFromPo(purchaseOrderItemId: string): void {
  if (!purchaseOrderItemId) {
    return
  }
  const poItem = poItemMap.value.get(purchaseOrderItemId)
  if (!poItem) {
    return
  }
  emitRows([
    ...props.modelValue,
    {
      purchaseOrderItemId: poItem.purchaseOrderItemId,
      productId: poItem.productId,
      acceptedQuantity: poItem.outstandingQuantity,
      rejectedQuantity: 0,
      uomId: poItem.uomId,
      batchNumber: '',
      lotNumber: '',
      expiryDate: '',
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
            <th class="w-20 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Dipesan
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Diterima
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Ditolak
            </th>
            <th class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Batch
            </th>
            <th class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kadaluarsa
            </th>
            <th class="w-36 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Lot
            </th>
            <th class="w-16 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="row.purchaseOrderItemId || index"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <!-- Product (read-only — dictated by the source PO item) -->
            <td class="px-4 py-3 align-top">
              <div class="flex min-h-11 flex-col justify-center">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ productLabel(row.productId) }}
                </span>
                <span
                  v-if="isBatchTracked(row.productId)"
                  class="text-theme-xs text-brand-500 dark:text-brand-400"
                >
                  Batch-tracked
                </span>
                <span v-else class="text-theme-xs text-gray-400 dark:text-gray-500">
                  Dari item PO
                </span>
              </div>
            </td>
            <!-- Ordered (read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-600 dark:text-gray-300">
              {{ orderedForRow(row) }}
            </td>
            <!-- Accepted -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.acceptedQuantity"
                type="number"
                min="0"
                :max="maxQtyForRow(row) || undefined"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { acceptedQuantity: Number(($event.target as HTMLInputElement).value) })"
              />
            </td>
            <!-- Rejected -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.rejectedQuantity"
                type="number"
                min="0"
                :max="maxQtyForRow(row) || undefined"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { rejectedQuantity: Number(($event.target as HTMLInputElement).value) })"
              />
              <span
                v-if="overMax(row)"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Terima + tolak maks {{ maxQtyForRow(row) }} (sisa PO)
              </span>
              <span
                v-else-if="maxQtyForRow(row) > 0"
                class="mt-1 block text-theme-xs text-gray-400 dark:text-gray-500"
              >
                Maks {{ maxQtyForRow(row) }} (sisa PO)
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
            <!-- Batch Number -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.batchNumber"
                type="text"
                :disabled="disabled"
                :placeholder="isBatchTracked(row.productId) ? 'Wajib' : 'Opsional'"
                :class="inputClass"
                @input="updateRow(index, { batchNumber: ($event.target as HTMLInputElement).value })"
              />
              <span
                v-if="isBatchTracked(row.productId) && Number(row.acceptedQuantity) > 0 && !row.batchNumber.trim()"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Batch wajib
              </span>
            </td>
            <!-- Expiry Date -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.expiryDate"
                type="date"
                :disabled="disabled"
                :class="inputClass"
                @click="($event.target as HTMLInputElement).showPicker?.()"
                @focus="($event.target as HTMLInputElement).showPicker?.()"
                @input="updateRow(index, { expiryDate: ($event.target as HTMLInputElement).value })"
              />
              <span
                v-if="isBatchTracked(row.productId) && Number(row.acceptedQuantity) > 0 && !row.expiryDate"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Kadaluarsa wajib
              </span>
            </td>
            <!-- Lot Number -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.lotNumber"
                type="text"
                :disabled="disabled"
                placeholder="Opsional"
                :class="inputClass"
                @input="updateRow(index, { lotNumber: ($event.target as HTMLInputElement).value })"
              />
            </td>
            <!-- Remove -->
            <td class="px-4 py-3 text-end align-top">
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
              colspan="9"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              <template v-if="poItems.length === 0">
                Pilih PO sumber untuk memuat item yang masih tersisa (outstanding).
              </template>
              <template v-else>
                Belum ada item. Tambahkan dari item PO di bawah.
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add from PO items — only items not already in the table; never a product catalog -->
    <div v-if="!disabled && addableItems.length > 0" class="flex items-center gap-2">
      <div class="relative w-full max-w-xs">
        <select
          value=""
          :class="[inputClass, 'appearance-none pe-10']"
          aria-label="Tambah dari item PO"
          @change="onAddFromPo(($event.target as HTMLSelectElement).value); ($event.target as HTMLSelectElement).value = ''"
        >
          <option value="" disabled>Tambah dari item PO...</option>
          <option v-for="item in addableItems" :key="item.purchaseOrderItemId" :value="item.purchaseOrderItemId">
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
      Item hanya dapat dipilih dari item PO sumber. Jumlah diterima + ditolak tidak
      boleh melebihi sisa (outstanding) PO. Untuk produk batch-tracked dengan jumlah
      diterima &gt; 0, nomor batch dan tanggal kadaluarsa wajib diisi.
    </p>
  </div>
</template>
