<script setup lang="ts">
/**
 * StockAdjustmentItemsEditor — batch-targeted line-items grid for the Stock
 * Adjustment form.
 *
 * Business rule (backend-authoritative, mirrored here for UX): each item
 * targets an EXISTING inventory batch (`batchId` + `productId`), not a free
 * product. The batch picker lists batches of the currently selected header
 * outlet (loaded once per outlet by the parent). Picking a batch auto-fills the
 * row's `productId` and shows helper info (product name + SKU, batch number,
 * available qty) so the user does not mis-pick. Each row also needs a direction
 * (IN/OUT), a positive qty, and a mandatory reason; `reasonDescription` is free
 * text (required by the UI only when reason = OTHER, for clarity).
 *
 * Rows are added via "Tambah Item" (an empty row the user fills in). An OUT
 * adjustment whose qty exceeds the batch's current available qty is flagged
 * inline (the backend also rejects it on completion), but the warning does not
 * block saving a draft.
 */
import { computed } from 'vue'
import { Trash2 } from 'lucide-vue-next'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { PlusIcon } from '@/icons'
import { formatNumber } from '@/lib/format'
import type { BatchWithExpiry } from '@/services/inventory.service'
import type { Product } from '@/services/product.service'
import {
  ADJUSTMENT_DIRECTIONS,
  ADJUSTMENT_DIRECTION_LABELS,
  ADJUSTMENT_REASONS,
  ADJUSTMENT_REASON_LABELS,
  type AdjustmentDirection,
  type AdjustmentReason,
} from '@/services/stock-adjustment.service'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface EditorItemRow {
  batchId: string
  productId: string
  direction: AdjustmentDirection
  qty: number
  reason: AdjustmentReason
  reasonDescription: string
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  /** Batches of the selected header outlet — the only batches selectable here. */
  batches: BatchWithExpiry[]
  products: Product[]
  /** True while no outlet is chosen yet (picker + add disabled). */
  outletChosen: boolean
  /** True while the batches list is still loading for the chosen outlet. */
  batchesLoading: boolean
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

/** Fast lookup of a batch row by its id. */
const batchMap = computed<Map<string, BatchWithExpiry>>(
  () => new Map(props.batches.map((b) => [b.batch.id, b])),
)

/** Human label for a batch option: batch number + product + available qty. */
function batchOptionLabel(entry: BatchWithExpiry): string {
  const product = productMap.value.get(entry.batch.productId)
  const productLabel = product ? `${product.name} (${product.sku})` : entry.batch.productId
  const batchLabel = entry.batch.batchNumber || '(tanpa batch)'
  return `${batchLabel} · ${productLabel} · tersedia ${formatNumber(entry.batch.qtyAvailable)}`
}

/** Resolved product label (name + SKU) for a chosen row. */
function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId || '—'
}

/** Current available qty of the row's batch (display + OUT validation). */
function availableForRow(row: EditorItemRow): number | null {
  const entry = batchMap.value.get(row.batchId)
  return entry ? entry.batch.qtyAvailable : null
}

/** True when an OUT row's qty exceeds the batch's current available qty. */
function overAvailable(row: EditorItemRow): boolean {
  if (row.direction !== 'OUT') {
    return false
  }
  const available = availableForRow(row)
  if (available === null) {
    return false
  }
  return (Number(row.qty) || 0) > available
}

function emitRows(rows: EditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/** Picking a batch auto-fills the row's productId from the chosen batch. */
function onPickBatch(index: number, batchId: string): void {
  const entry = batchMap.value.get(batchId)
  updateRow(index, {
    batchId,
    productId: entry ? entry.batch.productId : '',
  })
}

function addRow(): void {
  emitRows([
    ...props.modelValue,
    {
      batchId: '',
      productId: '',
      direction: 'IN',
      qty: 1,
      reason: 'STOCK_COUNT',
      reasonDescription: '',
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
            <th class="w-72 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Batch
            </th>
            <th class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Arah
            </th>
            <th class="w-28 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="w-40 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Alasan
            </th>
            <th class="w-48 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Keterangan
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
            <!-- Batch picker -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.batchId"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="onPickBatch(index, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="" disabled>Pilih batch...</option>
                  <option
                    v-for="entry in batches"
                    :key="entry.batch.id"
                    :value="entry.batch.id"
                  >
                    {{ batchOptionLabel(entry) }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
              <div v-if="row.batchId" class="mt-1 flex flex-col gap-0.5">
                <span class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ productLabel(row.productId) }}
                </span>
                <span
                  v-if="availableForRow(row) !== null"
                  class="text-theme-xs text-gray-400 dark:text-gray-500"
                >
                  Tersedia saat ini: {{ formatNumber(availableForRow(row)) }}
                </span>
              </div>
            </td>
            <!-- Direction -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.direction"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="updateRow(index, { direction: ($event.target as HTMLSelectElement).value as AdjustmentDirection })"
                >
                  <option v-for="d in ADJUSTMENT_DIRECTIONS" :key="d" :value="d">
                    {{ ADJUSTMENT_DIRECTION_LABELS[d] }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
            </td>
            <!-- Qty -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.qty"
                type="number"
                min="0"
                step="any"
                :disabled="disabled"
                :class="inputClass"
                @input="updateRow(index, { qty: Number(($event.target as HTMLInputElement).value) })"
              />
              <span
                v-if="overAvailable(row)"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Melebihi stok tersedia ({{ formatNumber(availableForRow(row)) }})
              </span>
            </td>
            <!-- Reason -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.reason"
                  :disabled="disabled"
                  :class="[inputClass, 'appearance-none pe-10']"
                  @change="updateRow(index, { reason: ($event.target as HTMLSelectElement).value as AdjustmentReason })"
                >
                  <option v-for="r in ADJUSTMENT_REASONS" :key="r" :value="r">
                    {{ ADJUSTMENT_REASON_LABELS[r] }}
                  </option>
                </select>
                <ChevronDownIcon
                  class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
                />
              </div>
            </td>
            <!-- Reason description -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.reasonDescription"
                type="text"
                :disabled="disabled"
                :placeholder="row.reason === 'OTHER' ? 'Wajib untuk alasan Lainnya' : 'Opsional'"
                :class="inputClass"
                @input="updateRow(index, { reasonDescription: ($event.target as HTMLInputElement).value })"
              />
              <span
                v-if="row.reason === 'OTHER' && !row.reasonDescription.trim()"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Keterangan wajib
              </span>
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
              colspan="6"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              <template v-if="!outletChosen">
                Pilih outlet terlebih dahulu untuk memuat batch yang dapat disesuaikan.
              </template>
              <template v-else-if="batchesLoading">
                Memuat batch outlet...
              </template>
              <template v-else-if="batches.length === 0">
                Tidak ada batch stok pada outlet ini.
              </template>
              <template v-else>
                Belum ada item. Tambahkan baris lalu pilih batch.
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add row — enabled once an outlet is chosen and it has batches -->
    <div v-if="!disabled" class="flex items-center gap-2">
      <button
        type="button"
        :disabled="!outletChosen || batchesLoading || batches.length === 0"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        @click="addRow"
      >
        <PlusIcon class="h-4 w-4" aria-hidden="true" />
        Tambah Item
      </button>
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Setiap item menyesuaikan satu batch stok yang sudah ada. Arah "Masuk"
      menambah stok, "Keluar" mengurangi stok. Perubahan baru diposting saat
      dokumen diselesaikan (Complete).
    </p>
  </div>
</template>
