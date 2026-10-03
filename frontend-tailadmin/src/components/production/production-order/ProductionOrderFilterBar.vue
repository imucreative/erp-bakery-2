<script setup lang="ts">
/**
 * ProductionOrderFilterBar — search (productionNumber) + outlet filter toolbar
 * for the Production Order list. Native select wrapped with a ChevronDownIcon
 * per the UI standard. Two-way binds `search` and `outlet` via v-model:search /
 * v-model:outlet. Outlet options are resolved once by the parent (accessible
 * outlets). The instant-complete model has a single status (COMPLETED), so there
 * is no status filter.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'

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
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nomor produksi..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <select
        :value="outlet"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:outlet', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Outlet</option>
        <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
