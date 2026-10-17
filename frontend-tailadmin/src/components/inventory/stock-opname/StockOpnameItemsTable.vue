<script setup lang="ts">
/**
 * StockOpnameItemsTable — line-items table for a Stock Opname detail view.
 * Columns: Produk, Batch, System Qty, Counted Qty, Selisih (badge coloured by
 * sign). Pure presentation: resolves product/batch ids → names via injected
 * resolver callbacks.
 *
 * INLINE COUNT (COUNTING only): when `editable` is true, each row renders a
 * "Qty Fisik" number input plus an icon-only save button that emits
 * `record-count` { itemId, countedQty }. Local draft values are kept per row so
 * the input stays controlled; the parent runs the mutation and replaces the
 * opname from the response. Outside COUNTING the counted/difference columns are
 * read-only. `savingItemId` disables the row being saved.
 */
import { reactive } from 'vue'
import { Save } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import {
  BaseButton,
  BaseInput,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
import { formatNumber } from '@/lib/format'
import {
  differenceBadgeColor,
  type StockOpname,
  type StockOpnameItem,
} from '@/services/stock-opname.service'

const props = defineProps<{
  opname: StockOpname
  productName: (id: string) => string
  batchLabel: (id: string) => string
  editable: boolean
  savingItemId: string | null
}>()

const emit = defineEmits<{
  (e: 'record-count', payload: { itemId: string; countedQty: number }): void
}>()

// Per-row draft entry for the "Qty Fisik" input, keyed by item id. Initialized
// lazily from the item's current countedQty when first edited.
const drafts = reactive<Record<string, string>>({})

function draftValue(item: StockOpnameItem): string {
  if (item.id in drafts) {
    return drafts[item.id]
  }
  return item.countedQty !== null ? String(item.countedQty) : ''
}

function onDraftInput(itemId: string, value: string): void {
  drafts[itemId] = value
}

/** Parse the current draft; returns null when blank or invalid/negative. */
function parsedCount(item: StockOpnameItem): number | null {
  const raw = draftValue(item).trim()
  if (raw === '') {
    return null
  }
  const value = Number(raw)
  if (!Number.isFinite(value) || value < 0) {
    return null
  }
  return value
}

function onSave(item: StockOpnameItem): void {
  const countedQty = parsedCount(item)
  if (countedQty === null) {
    return
  }
  emit('record-count', { itemId: item.id, countedQty })
}
</script>

<template>
  <BaseTable aria-label="Item stock opname">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead align="end">System Qty</BaseTableHead>
        <BaseTableHead align="end">Counted Qty</BaseTableHead>
        <BaseTableHead align="end">Selisih</BaseTableHead>
        <BaseTableHead v-if="props.editable" align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-if="props.opname.items.length === 0">
        <BaseTableCell :colspan="props.editable ? 6 : 5" align="center">
          Belum ada item. Mulai penghitungan untuk menyalin stok outlet.
        </BaseTableCell>
      </BaseTableRow>
      <BaseTableRow v-for="item in props.opname.items" :key="item.id">
        <BaseTableCell emphasis="medium">
          {{ props.productName(item.productId) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ props.batchLabel(item.batchId) }}
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatNumber(item.systemQty) }}
        </BaseTableCell>
        <BaseTableCell align="end">
          <!-- Inline count input while COUNTING -->
          <div v-if="props.editable" class="flex justify-end">
            <BaseInput
              :id="`stock-opname-count-${item.id}`"
              :model-value="draftValue(item)"
              type="number"
              min="0"
              step="any"
              placeholder="Qty Fisik"
              :disabled="props.savingItemId === item.id"
              aria-label="Qty Fisik"
              @update:model-value="onDraftInput(item.id, $event)"
            />
          </div>
          <span v-else class="text-theme-sm text-gray-800 dark:text-white/90">
            {{ item.countedQty !== null ? formatNumber(item.countedQty) : '-' }}
          </span>
        </BaseTableCell>
        <BaseTableCell align="end">
          <Badge
            v-if="item.differenceQty !== null"
            :color="differenceBadgeColor(item.differenceQty)"
          >
            {{ item.differenceQty > 0 ? '+' : '' }}{{ formatNumber(item.differenceQty) }}
          </Badge>
          <span v-else class="text-theme-sm text-gray-400 dark:text-gray-500">-</span>
        </BaseTableCell>
        <BaseTableCell v-if="props.editable" align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              size="sm"
              variant="primary"
              icon-only
              aria-label="Simpan qty fisik"
              title="Simpan qty fisik"
              :disabled="props.savingItemId === item.id || parsedCount(item) === null"
              @click="onSave(item)"
            >
              <Save class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
