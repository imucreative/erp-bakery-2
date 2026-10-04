<script setup lang="ts">
/**
 * PurchaseReturnItemsEditor — returnable-lines grid for the Purchase Return
 * create/edit form.
 *
 * Business rule (backend-authoritative, mirrored here for UX): a Purchase
 * Return's items may ONLY come from the returnable lines of its source
 * (COMPLETED) Goods Receipt. Each row corresponds to one returnable line and
 * carries its snapshot fields verbatim into the create payload. Specifically:
 *   1. Product/batch/lot/expiry/UOM are NOT free-choice — each row is dictated
 *      by a `ReturnableLine` and rendered read-only.
 *   2. The user chooses WHICH lines to return via a per-row `included` toggle.
 *      Lines with `returnableQuantity <= 0` have nothing left to return and
 *      cannot be toggled on.
 *   3. `returnQuantity` may not exceed `returnableQuantity` per included row.
 *   4. `reason` is required per included row; `reasonDescription` is required
 *      when `reason === 'OTHER'` (backend validates 400; mirrored here).
 *
 * Rows are supplied prefilled (included:false) by the parent after it resolves
 * the source GR's returnable set. The parent maps included rows to the API
 * payload.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { formatDate } from '@/lib/format'
import {
  PURCHASE_RETURN_REASONS,
  PURCHASE_RETURN_REASON_LABELS,
  type PurchaseReturnReason,
} from '@/services/purchase-return.service'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface EditorReturnRow {
  goodsReceiptItemId: string
  sourceBatchId: string
  sourceMovementId: string
  productId: string
  productSku: string
  productName: string
  uomId: string
  uomCode: string
  uomName: string
  batchNumber: string | null
  lotNumber: string | null
  expiredDate: string | null
  postedAcceptedQuantity: number
  previouslyReturnedQuantity: number
  returnableQuantity: number
  included: boolean
  returnQuantity: number
  reason: PurchaseReturnReason | ''
  reasonDescription: string
}

const props = defineProps<{
  modelValue: EditorReturnRow[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', rows: EditorReturnRow[]): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

/** Human label for a row's product (name + SKU). */
function productLabel(row: EditorReturnRow): string {
  return `${row.productName} (${row.productSku})`
}

/** True when the row has nothing left to return (cannot be toggled on). */
function noneReturnable(row: EditorReturnRow): boolean {
  return row.returnableQuantity <= 0
}

/** True when an included row's return quantity exceeds the returnable cap. */
function overMax(row: EditorReturnRow): boolean {
  if (!row.included) {
    return false
  }
  return (Number(row.returnQuantity) || 0) > row.returnableQuantity
}

/** True when an included row chose OTHER but left the description empty. */
function missingReasonDescription(row: EditorReturnRow): boolean {
  if (!row.included) {
    return false
  }
  return row.reason === 'OTHER' && !row.reasonDescription.trim()
}

function emitRows(rows: EditorReturnRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorReturnRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
            <th class="w-16 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Retur
            </th>
            <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="w-44 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Batch / Lot / Kadaluarsa
            </th>
            <th class="w-24 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="w-24 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Diterima
            </th>
            <th class="w-28 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Sudah Diretur
            </th>
            <th class="w-28 px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Dapat Diretur
            </th>
            <th class="w-32 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Jumlah Retur
            </th>
            <th class="w-44 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Alasan
            </th>
            <th class="w-48 px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Keterangan
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in modelValue"
            :key="row.goodsReceiptItemId || index"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <!-- Include toggle -->
            <td class="px-4 py-3 align-top">
              <div class="flex min-h-11 items-center">
                <ToggleSwitch
                  :model-value="row.included"
                  :disabled="disabled || noneReturnable(row)"
                  @update:model-value="updateRow(index, { included: $event })"
                />
              </div>
            </td>
            <!-- Product (read-only) -->
            <td class="px-4 py-3 align-top">
              <div class="flex min-h-11 flex-col justify-center">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ productLabel(row) }}
                </span>
                <span
                  v-if="noneReturnable(row)"
                  class="text-theme-xs text-gray-400 dark:text-gray-500"
                >
                  Tidak ada sisa untuk diretur
                </span>
              </div>
            </td>
            <!-- Batch / Lot / Expiry (read-only snapshot) -->
            <td class="px-4 py-3 align-top">
              <div class="flex min-h-11 flex-col justify-center text-theme-xs text-gray-600 dark:text-gray-300">
                <span>Batch: {{ row.batchNumber || '-' }}</span>
                <span>Lot: {{ row.lotNumber || '-' }}</span>
                <span>Exp: {{ row.expiredDate ? formatDate(row.expiredDate) : '-' }}</span>
              </div>
            </td>
            <!-- UOM (read-only) -->
            <td class="px-4 py-3 align-middle text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.uomName }}
            </td>
            <!-- Posted accepted (read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.postedAcceptedQuantity }}
            </td>
            <!-- Previously returned (read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.previouslyReturnedQuantity }}
            </td>
            <!-- Returnable (read-only) -->
            <td class="px-4 py-3 text-end align-middle text-theme-sm text-gray-800 dark:text-white/90">
              {{ row.returnableQuantity }}
            </td>
            <!-- Return quantity -->
            <td class="px-4 py-3 align-top">
              <input
                :value="row.returnQuantity"
                type="number"
                min="0"
                :max="row.returnableQuantity || undefined"
                step="any"
                :disabled="disabled || !row.included"
                :class="inputClass"
                @input="updateRow(index, { returnQuantity: Number(($event.target as HTMLInputElement).value) })"
              />
              <span v-if="overMax(row)" class="mt-1 block text-theme-xs text-error-500">
                Maks {{ row.returnableQuantity }} (dapat diretur)
              </span>
            </td>
            <!-- Reason -->
            <td class="px-4 py-3 align-top">
              <div class="relative">
                <select
                  :value="row.reason"
                  :disabled="disabled || !row.included"
                  :class="[inputClass, 'appearance-none pe-10']"
                  aria-label="Alasan retur"
                  @change="updateRow(index, { reason: ($event.target as HTMLSelectElement).value as PurchaseReturnReason | '' })"
                >
                  <option value="" disabled>Pilih alasan</option>
                  <option v-for="reason in PURCHASE_RETURN_REASONS" :key="reason" :value="reason">
                    {{ PURCHASE_RETURN_REASON_LABELS[reason] }}
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
                :disabled="disabled || !row.included"
                :placeholder="row.reason === 'OTHER' ? 'Wajib' : 'Opsional'"
                :class="inputClass"
                @input="updateRow(index, { reasonDescription: ($event.target as HTMLInputElement).value })"
              />
              <span
                v-if="missingReasonDescription(row)"
                class="mt-1 block text-theme-xs text-error-500"
              >
                Keterangan wajib untuk alasan Lainnya
              </span>
            </td>
          </tr>

          <tr v-if="modelValue.length === 0">
            <td
              colspan="10"
              class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
            >
              Pilih GR sumber untuk memuat baris yang dapat diretur.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Hanya baris dengan sisa dapat-diretur yang bisa dipilih. Jumlah retur tidak
      boleh melebihi jumlah dapat diretur. Keterangan wajib bila alasan Lainnya.
    </p>
  </div>
</template>
