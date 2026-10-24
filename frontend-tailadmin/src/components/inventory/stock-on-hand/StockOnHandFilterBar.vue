<script setup lang="ts">
/**
 * StockOnHandFilterBar — search (product name/SKU) + outlet filter + a
 * "low stock only" toggle for the Stock On Hand list. Native select wrapped
 * with a ChevronDownIcon per the UI standard; the boolean filter uses
 * ToggleSwitch (never a checkbox). Two-way binds `search`, `outletId`, and
 * `lowOnly`. Outlet options are resolved by the parent (fetched once).
 */
import { BaseInput, BaseSelect, BaseToggle } from '@/components/ui'

interface OutletOption {
  id: string
  name: string
}

defineProps<{
  search: string
  outletId: string
  lowOnly: boolean
  outlets: OutletOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:outletId', value: string): void
  (event: 'update:lowOnly', value: boolean): void
}>()
</script>

<template>
  <div class="stack-row">
    <div class="w-full sm:max-w-xs">
      <BaseInput
        id="stock-on-hand-search"
        :model-value="search"
        placeholder="Cari nama / SKU produk..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>

    <div class="w-full sm:w-56">
      <BaseSelect
        id="stock-on-hand-outlet"
        :model-value="outletId"
        :options="[
          { value: '', label: 'Semua Outlet' },
          ...outlets.map((outlet) => ({ value: outlet.id, label: outlet.name })),
        ]"
        @update:model-value="emit('update:outletId', $event)"
      />
    </div>

    <div class="flex items-center sm:ms-1">
      <BaseToggle
        :model-value="lowOnly"
        label="Hanya stok rendah"
        @update:model-value="emit('update:lowOnly', $event)"
      />
    </div>
  </div>
</template>
