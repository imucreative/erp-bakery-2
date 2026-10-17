<script setup lang="ts">
/**
 * StockTransferFilterBar — search (transferNumber/notes) + status filter +
 * source-outlet filter + destination-outlet filter toolbar for the Stock
 * Transfer list. Native selects wrapped with a ChevronDownIcon per the UI
 * standard. Two-way binds `search`, `status`, `sourceOutlet`, and
 * `destinationOutlet` via v-model. Outlet options are resolved once by the
 * parent.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import { TRANSFER_STATUS_LABELS } from '@/services/stock-transfer.service'
import type { StatusFilter } from '@/composables/useStockTransfers'

interface OutletOption {
  id: string
  name: string
}

defineProps<{
  search: string
  status: StatusFilter
  sourceOutlet: string
  destinationOutlet: string
  outlets: OutletOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:sourceOutlet', value: string): void
  (event: 'update:destinationOutlet', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <BaseInput
      id="stock-transfer-search"
      :model-value="search"
      type="search"
      placeholder="Cari nomor / catatan..."
      class="sm:max-w-xs"
      @update:model-value="emit('update:search', $event)"
    />
    <BaseSelect
      id="stock-transfer-status"
      :model-value="status"
      :options="[
        { value: 'all', label: 'Semua Status' },
        ...Object.entries(TRANSFER_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      ]"
      class="sm:w-44"
      @update:model-value="emit('update:status', $event as StatusFilter)"
    />
    <BaseSelect
      id="stock-transfer-source"
      :model-value="sourceOutlet"
      :options="outlets.map((o) => ({ value: o.id, label: o.name }))"
      placeholder="Semua Outlet Sumber"
      class="sm:w-52"
      @update:model-value="emit('update:sourceOutlet', $event)"
    />
    <BaseSelect
      id="stock-transfer-destination"
      :model-value="destinationOutlet"
      :options="outlets.map((o) => ({ value: o.id, label: o.name }))"
      placeholder="Semua Outlet Tujuan"
      class="sm:w-52"
      @update:model-value="emit('update:destinationOutlet', $event)"
    />
  </div>
</template>
