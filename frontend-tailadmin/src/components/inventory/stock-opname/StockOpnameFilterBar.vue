<script setup lang="ts">
/**
 * StockOpnameFilterBar — search (opnameNumber/notes) + status filter + outlet
 * filter toolbar for the Stock Opname list. Native selects wrapped with a
 * ChevronDownIcon per the UI standard. Two-way binds `search`, `status`, and
 * `outlet` via v-model:search / v-model:status / v-model:outlet. Outlet options
 * are resolved once by the parent.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import { OPNAME_STATUSES, OPNAME_STATUS_LABELS } from '@/services/stock-opname.service'
import type { OpnameStatusFilter } from '@/composables/useStockOpnames'

interface OutletOption {
  id: string
  name: string
}

defineProps<{
  search: string
  status: OpnameStatusFilter
  outlet: string
  outlets: OutletOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: OpnameStatusFilter): void
  (event: 'update:outlet', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <BaseInput
      id="stock-opname-search"
      :model-value="search"
      type="search"
      placeholder="Cari nomor / catatan..."
      class="sm:max-w-xs"
      @update:model-value="emit('update:search', $event)"
    />
    <BaseSelect
      id="stock-opname-status"
      :model-value="status"
      :options="[
        { value: 'all', label: 'Semua Status' },
        ...OPNAME_STATUSES.map((value) => ({ value, label: OPNAME_STATUS_LABELS[value] })),
      ]"
      class="sm:w-48"
      @update:model-value="emit('update:status', $event as OpnameStatusFilter)"
    />
    <BaseSelect
      id="stock-opname-outlet"
      :model-value="outlet"
      :options="outlets.map((option) => ({ value: option.id, label: option.name }))"
      placeholder="Semua Outlet"
      class="sm:w-56"
      @update:model-value="emit('update:outlet', $event)"
    />
  </div>
</template>
