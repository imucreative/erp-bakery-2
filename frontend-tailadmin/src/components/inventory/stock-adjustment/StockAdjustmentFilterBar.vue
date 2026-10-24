<script setup lang="ts">
/**
 * StockAdjustmentFilterBar — search (adjustmentNumber/notes) + status filter +
 * outlet filter toolbar for the Stock Adjustment list. Native selects wrapped
 * with a ChevronDownIcon per the UI standard. Two-way binds `search`, `status`,
 * and `outlet` via v-model:search / v-model:status / v-model:outlet. Outlet
 * options are resolved once by the parent.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import {
  STOCK_ADJUSTMENT_STATUSES,
  STOCK_ADJUSTMENT_STATUS_LABELS,
} from '@/services/stock-adjustment.service'
import type { StatusFilter } from '@/composables/useStockAdjustments'

interface OutletOption {
  id: string
  name: string
}

defineProps<{
  search: string
  status: StatusFilter
  outlet: string
  outlets: OutletOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:outlet', value: string): void
}>()

const statusOptions = [
  { value: 'all' as const, label: 'Semua Status' },
  ...STOCK_ADJUSTMENT_STATUSES.map((status: keyof typeof STOCK_ADJUSTMENT_STATUS_LABELS) => ({
    value: status,
    label: STOCK_ADJUSTMENT_STATUS_LABELS[status],
  })),
]
</script>

<template>
  <div class="stack-row">
    <div class="w-full sm:max-w-xs">
      <BaseInput
        id="stock-adjustment-search"
        :model-value="search"
        placeholder="Cari nomor / catatan..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="w-full sm:w-48">
      <BaseSelect
        id="stock-adjustment-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="w-full sm:w-56">
      <BaseSelect
        id="stock-adjustment-outlet"
        :model-value="outlet"
        :options="[
          { value: '', label: 'Semua Outlet' },
          ...outlets.map((item) => ({ value: item.id, label: item.name })),
        ]"
        @update:model-value="emit('update:outlet', $event)"
      />
    </div>
  </div>
</template>
