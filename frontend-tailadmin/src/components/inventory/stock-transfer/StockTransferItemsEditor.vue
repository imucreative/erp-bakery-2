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
import { formatNumber, formatDate } from '@/lib/format'
import type { BatchWithExpiry } from '@/services/inventory.service'
import type { Product } from '@/services/product.service'

export interface EditorItemRow {
  sourceBatchId: string
  productId: string
  qty: number
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  batches: BatchWithExpiry[]
  products: Product[]
  sourceChosen: boolean
  batchesLoading: boolean
  disabled?: boolean
}>()
const emit = defineEmits<{ (event: 'update:modelValue', rows: EditorItemRow[]): void }>()
const productMap = computed(() => new Map(props.products.map((product) => [product.id, product])))
const batchMap = computed(() => new Map(props.batches.map((entry) => [entry.batch.id, entry])))

function batchOptionLabel(entry: BatchWithExpiry): string {
  const product = productMap.value.get(entry.batch.productId)
  return `${entry.batch.batchNumber || '(tanpa batch)'} · ${product ? `${product.name} (${product.sku})` : entry.batch.productId} · tersedia ${formatNumber(entry.batch.qtyAvailable)}`
}
function productLabel(id: string): string {
  const product = productMap.value.get(id)
  return product ? `${product.name} (${product.sku})` : id || '—'
}
function availableForRow(row: EditorItemRow): number | null {
  return batchMap.value.get(row.sourceBatchId)?.batch.qtyAvailable ?? null
}
function overAvailable(row: EditorItemRow): boolean {
  const available = availableForRow(row)
  return available !== null && (Number(row.qty) || 0) > available
}
function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  emit(
    'update:modelValue',
    props.modelValue.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
  )
}
function onPickBatch(index: number, sourceBatchId: string): void {
  updateRow(index, {
    sourceBatchId,
    productId: batchMap.value.get(sourceBatchId)?.batch.productId ?? '',
  })
}
function addRow(): void {
  emit('update:modelValue', [...props.modelValue, { sourceBatchId: '', productId: '', qty: 1 }])
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
    <BaseTable aria-label="Editor item stock transfer">
      <template #header
        ><BaseTableRow variant="header"
          ><BaseTableHead>Batch Sumber</BaseTableHead><BaseTableHead>Qty</BaseTableHead
          ><BaseTableHead align="end">Aksi</BaseTableHead></BaseTableRow
        ></template
      >
      <template #body>
        <BaseTableRow v-for="(row, index) in modelValue" :key="index">
          <BaseTableCell class="align-top">
            <BaseSelect
              :id="`stock-transfer-batch-${index}`"
              :model-value="row.sourceBatchId"
              :options="
                batches.map((entry) => ({ value: entry.batch.id, label: batchOptionLabel(entry) }))
              "
              :disabled="disabled"
              placeholder="Pilih batch..."
              @update:model-value="onPickBatch(index, $event)"
            />
            <div v-if="row.sourceBatchId" class="mt-1 flex flex-col gap-0.5">
              <span class="text-meta">{{ productLabel(row.productId) }}</span
              ><span
                v-if="availableForRow(row) !== null"
                class="text-theme-xs text-gray-400 dark:text-gray-500"
                >Tersedia saat ini: {{ formatNumber(availableForRow(row))
                }}<template v-if="batchMap.get(row.sourceBatchId)?.batch.expiredDate">
                  · Exp:
                  {{ formatDate(batchMap.get(row.sourceBatchId)?.batch.expiredDate) }}</template
                ></span
              >
            </div>
          </BaseTableCell>
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`stock-transfer-qty-${index}`"
              :model-value="row.qty"
              type="number"
              min="0"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { qty: Number($event) })"
            />
            <span v-if="overAvailable(row)" class="mt-1 block text-theme-xs text-error-500"
              >Melebihi stok tersedia ({{ formatNumber(availableForRow(row)) }})</span
            >
          </BaseTableCell>
          <BaseTableCell align="end" class="align-top"
            ><BaseButton
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus baris"
              title="Hapus baris"
              :disabled="disabled"
              @click="removeRow(index)"
              ><Trash2 class="h-4 w-4" aria-hidden="true" /></BaseButton
          ></BaseTableCell>
        </BaseTableRow>
        <BaseTableRow v-if="modelValue.length === 0"
          ><BaseTableCell colspan="3" align="center"
            ><template v-if="!sourceChosen"
              >Pilih outlet sumber terlebih dahulu untuk memuat batch yang dapat
              ditransfer.</template
            ><template v-else-if="batchesLoading">Memuat batch outlet sumber...</template
            ><template v-else-if="batches.length === 0"
              >Tidak ada batch stok pada outlet sumber ini.</template
            ><template v-else
              >Belum ada item. Tambahkan baris lalu pilih batch.</template
            ></BaseTableCell
          ></BaseTableRow
        >
      </template>
    </BaseTable>
    <div v-if="!disabled">
      <BaseButton
        size="sm"
        variant="outline"
        :disabled="!sourceChosen || batchesLoading || batches.length === 0"
        @click="addRow"
        ><template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>Tambah
        Item</BaseButton
      >
    </div>
    <p class="text-theme-xs text-gray-400 dark:text-gray-500">
      Setiap item memindahkan qty dari satu batch stok outlet sumber. Stok sumber baru berkurang
      saat transfer dikirim (Dispatch), dan masuk ke outlet tujuan saat diterima (Receive).
    </p>
  </div>
</template>
