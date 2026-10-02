<script setup lang="ts">
/**
 * StockOnHandFilterBar — search (product name/SKU) + outlet filter + a
 * "low stock only" toggle for the Stock On Hand list. Native select wrapped
 * with a ChevronDownIcon per the UI standard; the boolean filter uses
 * ToggleSwitch (never a checkbox). Two-way binds `search`, `outletId`, and
 * `lowOnly`. Outlet options are resolved by the parent (fetched once).
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

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
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nama / SKU produk..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="relative w-full sm:w-56">
      <select
        :value="outletId"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:outletId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Outlet</option>
        <option v-for="outlet in outlets" :key="outlet.id" :value="outlet.id">
          {{ outlet.name }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>

    <div class="flex items-center sm:ms-1">
      <ToggleSwitch
        :model-value="lowOnly"
        label="Hanya stok rendah"
        @update:model-value="emit('update:lowOnly', $event)"
      />
    </div>
  </div>
</template>
