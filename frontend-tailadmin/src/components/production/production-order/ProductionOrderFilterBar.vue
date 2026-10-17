<script setup lang="ts">
/**
 * ProductionOrderFilterBar — search (productionNumber) + outlet filter toolbar
 * for the Production Order list. Native select wrapped with a ChevronDownIcon
 * per the UI standard. Two-way binds `search` and `outlet` via v-model:search /
 * v-model:outlet. Outlet options are resolved once by the parent (accessible
 * outlets). The instant-complete model has a single status (COMPLETED), so there
 * is no status filter.
 */
import { BaseInput, BaseSelect } from '@/components/ui'

interface OutletOption {
  id: string
  name: string
}

defineProps<{
  search: string
  outlet: string
  outlets: OutletOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:outlet', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <BaseInput
      id="production-order-search"
      :model-value="search"
      type="search"
      placeholder="Cari nomor produksi..."
      class="sm:max-w-xs"
      @update:model-value="emit('update:search', $event)"
    />
    <BaseSelect
      id="production-order-outlet"
      :model-value="outlet"
      :options="outlets.map((option) => ({ value: option.id, label: option.name }))"
      placeholder="Semua Outlet"
      class="sm:w-56"
      @update:model-value="emit('update:outlet', $event)"
    />
  </div>
</template>
