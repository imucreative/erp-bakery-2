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

function uomName(id: string): string {
  return uomMap.value.get(id)?.name ?? '-'
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

function onProductChange(index: number, productId: string): void {
  const product = productMap.value.get(productId)
  const current = props.modelValue[index]
  const patch: Partial<EditorItemRow> = { productId }
  // Auto-fill UOM from the product when available.
  if (product?.uomId) {
    patch.uomId = product.uomId
  }
  // Pre-fill estimated price from the product's purchase price only when the
  // row's price hasn't been set yet (don't clobber a user-entered value).
  if (product && (!current || Number(current.estimatedPrice) === 0)) {
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
            <!-- Product -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.productId"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="onProductChange(index, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="" disabled>Pilih produk</option>
                  <option v-for="p in products" :key="p.id" :value="p.id">
                    {{ p.name }} ({{ p.sku }})
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
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
                  <option v-for="u in uoms" :key="u.id" :value="u.id">{{ u.name }}</option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
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
