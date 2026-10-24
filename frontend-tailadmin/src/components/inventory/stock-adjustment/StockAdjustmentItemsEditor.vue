<script setup lang="ts">
import { computed } from 'vue'
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
  batches: BatchWithExpiry[]
  products: Product[]
  outletChosen: boolean
  batchesLoading: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', rows: EditorItemRow[]): void
}>()

const productMap = computed(() => new Map(props.products.map((product) => [product.id, product])))
const batchMap = computed(() => new Map(props.batches.map((entry) => [entry.batch.id, entry])))
const directionOptions = ADJUSTMENT_DIRECTIONS.map((direction: AdjustmentDirection) => ({
  value: direction,
  label: ADJUSTMENT_DIRECTION_LABELS[direction],
}))
const reasonOptions = ADJUSTMENT_REASONS.map((reason: AdjustmentReason) => ({
  value: reason,
  label: ADJUSTMENT_REASON_LABELS[reason],
}))

function batchOptionLabel(entry: BatchWithExpiry): string {
  const product = productMap.value.get(entry.batch.productId)
  const productLabel = product ? `${product.name} (${product.sku})` : entry.batch.productId
  return `${entry.batch.batchNumber || '(tanpa batch)'} · ${productLabel} · tersedia ${formatNumber(entry.batch.qtyAvailable)}`
}

function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId || '—'
}

function availableForRow(row: EditorItemRow): number | null {
  return batchMap.value.get(row.batchId)?.batch.qtyAvailable ?? null
}

function overAvailable(row: EditorItemRow): boolean {
  const available = availableForRow(row)
  return row.direction === 'OUT' && available !== null && (Number(row.qty) || 0) > available
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  emit(
    'update:modelValue',
    props.modelValue.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
  )
}

function onPickBatch(index: number, batchId: string): void {
  updateRow(index, {
    batchId,
    productId: batchMap.value.get(batchId)?.batch.productId ?? '',
  })
}

function addRow(): void {
  emit('update:modelValue', [
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
  emit(
    'update:modelValue',
    props.modelValue.filter((_, rowIndex) => rowIndex !== index),
  )
}
</script>

<template>
  <div class="space-y-3">
    <BaseTable aria-label="Editor item stock adjustment">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Batch</BaseTableHead>
          <BaseTableHead>Arah</BaseTableHead>
          <BaseTableHead>Qty</BaseTableHead>
          <BaseTableHead>Alasan</BaseTableHead>
          <BaseTableHead>Keterangan</BaseTableHead>
          <BaseTableHead align="end">Aksi</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="(row, index) in modelValue" :key="index">
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`stock-adjustment-batch-${index}`"
              :model-value="row.batchId"
              :options="
                batches.map((entry) => ({ value: entry.batch.id, label: batchOptionLabel(entry) }))
              "
              :disabled="disabled"
              placeholder="Pilih batch..."
              @update:model-value="onPickBatch(index, $event)"
            />
            <div v-if="row.batchId" class="mt-1 flex flex-col gap-0.5">
              <span class="text-meta">{{ productLabel(row.productId) }}</span>
              <span
                v-if="availableForRow(row) !== null"
                class="text-theme-xs text-gray-400 dark:text-gray-500"
              >
                Tersedia saat ini: {{ formatNumber(availableForRow(row)) }}
              </span>
            </div>
          </BaseTableCell>
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`stock-adjustment-direction-${index}`"
              :model-value="row.direction"
              :options="directionOptions"
              :disabled="disabled"
              @update:model-value="updateRow(index, { direction: $event as AdjustmentDirection })"
            />
          </BaseTableCell>
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`stock-adjustment-qty-${index}`"
              :model-value="row.qty"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { qty: Number($event) })"
            />
            <span v-if="overAvailable(row)" class="mt-1 block text-theme-xs text-error-500">
              Melebihi stok tersedia ({{ formatNumber(availableForRow(row)) }})
            </span>
          </BaseTableCell>
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`stock-adjustment-reason-${index}`"
              :model-value="row.reason"
              :options="reasonOptions"
              :disabled="disabled"
              @update:model-value="updateRow(index, { reason: $event as AdjustmentReason })"
            />
          </BaseTableCell>
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`stock-adjustment-description-${index}`"
              :model-value="row.reasonDescription"
              :disabled="disabled"
              :placeholder="row.reason === 'OTHER' ? 'Wajib untuk alasan Lainnya' : 'Opsional'"
              @update:model-value="updateRow(index, { reasonDescription: $event })"
            />
            <span
              v-if="row.reason === 'OTHER' && !row.reasonDescription.trim()"
              class="mt-1 block text-theme-xs text-error-500"
            >
              Keterangan wajib
            </span>
          </BaseTableCell>
          <BaseTableCell align="end" class="align-top">
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
            <template v-if="!outletChosen"
              >Pilih outlet terlebih dahulu untuk memuat batch yang dapat disesuaikan.</template
            >
            <template v-else-if="batchesLoading">Memuat batch outlet...</template>
            <template v-else-if="batches.length === 0"
              >Tidak ada batch stok pada outlet ini.</template
            >
            <template v-else>Belum ada item. Tambahkan baris lalu pilih batch.</template>
          </BaseTableCell>
        </BaseTableRow>
      </template>
    </BaseTable>

    <div v-if="!disabled" class="flex items-center gap-2">
      <BaseButton
        size="sm"
        variant="outline"
        :disabled="!outletChosen || batchesLoading || batches.length === 0"
        @click="addRow"
      >
        <template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
        Tambah Item
      </BaseButton>
    </div>
    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Setiap item harus menargetkan batch yang tersedia pada outlet terpilih. Penyesuaian OUT yang
      melebihi stok tersedia akan ditolak backend saat penyelesaian.
    </p>
  </div>
</template>
