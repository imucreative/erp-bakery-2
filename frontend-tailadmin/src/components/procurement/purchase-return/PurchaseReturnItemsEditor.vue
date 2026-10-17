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
import {
  BaseInput,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
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

const purchaseReturnReasonOptions = PURCHASE_RETURN_REASONS.map((reason) => ({
  value: reason,
  label: PURCHASE_RETURN_REASON_LABELS[reason],
}))

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
    <BaseTable aria-label="Editor item purchase return">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Retur</BaseTableHead>
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead>Batch / Lot / Kadaluarsa</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead align="end">Diterima</BaseTableHead>
          <BaseTableHead align="end">Sudah Diretur</BaseTableHead>
          <BaseTableHead align="end">Dapat Diretur</BaseTableHead>
          <BaseTableHead>Jumlah Retur</BaseTableHead>
          <BaseTableHead>Alasan</BaseTableHead>
          <BaseTableHead>Keterangan</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <tr
          v-for="(row, index) in modelValue"
          :key="row.goodsReceiptItemId || index"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <!-- Include toggle -->
          <BaseTableCell class="align-top">
            <div class="flex min-h-11 items-center">
              <ToggleSwitch
                :model-value="row.included"
                :disabled="disabled || noneReturnable(row)"
                @update:model-value="updateRow(index, { included: $event })"
              />
            </div>
          </BaseTableCell>
          <!-- Product (read-only) -->
          <BaseTableCell class="align-top">
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
          </BaseTableCell>
          <!-- Batch / Lot / Expiry (read-only snapshot) -->
          <BaseTableCell class="align-top">
            <div
              class="flex min-h-11 flex-col justify-center text-theme-xs text-gray-600 dark:text-gray-300"
            >
              <span>Batch: {{ row.batchNumber || '-' }}</span>
              <span>Lot: {{ row.lotNumber || '-' }}</span>
              <span>Exp: {{ row.expiredDate ? formatDate(row.expiredDate) : '-' }}</span>
            </div>
          </BaseTableCell>
          <!-- UOM (read-only) -->
          <BaseTableCell class="align-middle">
            {{ row.uomName }}
          </BaseTableCell>
          <!-- Posted accepted (read-only) -->
          <BaseTableCell align="end" class="align-middle">
            {{ row.postedAcceptedQuantity }}
          </BaseTableCell>
          <!-- Previously returned (read-only) -->
          <BaseTableCell align="end" class="align-middle">
            {{ row.previouslyReturnedQuantity }}
          </BaseTableCell>
          <!-- Returnable (read-only) -->
          <BaseTableCell align="end" class="align-middle" emphasis="medium">
            {{ row.returnableQuantity }}
          </BaseTableCell>
          <!-- Return quantity -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-return-quantity-${index}`"
              :model-value="row.returnQuantity"
              type="number"
              min="0"
              :max="row.returnableQuantity || undefined"
              step="any"
              :disabled="disabled || !row.included"
              @update:model-value="updateRow(index, { returnQuantity: Number($event) })"
            />
            <span v-if="overMax(row)" class="mt-1 block text-theme-xs text-error-500">
              Maks {{ row.returnableQuantity }} (dapat diretur)
            </span>
          </BaseTableCell>
          <!-- Reason -->
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`purchase-return-reason-${index}`"
              :model-value="row.reason"
              :options="purchaseReturnReasonOptions"
              placeholder="Pilih alasan"
              :disabled="disabled || !row.included"
              aria-label="Alasan retur"
              @update:model-value="
                updateRow(index, { reason: $event as PurchaseReturnReason | '' })
              "
            />
          </BaseTableCell>
          <!-- Reason description -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`purchase-return-description-${index}`"
              :model-value="row.reasonDescription"
              type="text"
              :disabled="disabled || !row.included"
              :placeholder="row.reason === 'OTHER' ? 'Wajib' : 'Opsional'"
              @update:model-value="updateRow(index, { reasonDescription: $event })"
            />
            <span
              v-if="missingReasonDescription(row)"
              class="mt-1 block text-theme-xs text-error-500"
            >
              Keterangan wajib untuk alasan Lainnya
            </span>
          </BaseTableCell>
        </tr>

        <BaseTableRow v-if="modelValue.length === 0">
          <BaseTableCell colspan="10" align="center">
            Pilih GR sumber untuk memuat baris yang dapat diretur.
          </BaseTableCell>
        </BaseTableRow>
      </template>
    </BaseTable>

    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Hanya baris dengan sisa dapat-diretur yang bisa dipilih. Jumlah retur tidak boleh melebihi
      jumlah dapat diretur. Keterangan wajib bila alasan Lainnya.
    </p>
  </div>
</template>
