<script setup lang="ts">
/**
 * StockTransferFilterBar — search (transferNumber/notes) + status filter +
 * source-outlet filter + destination-outlet filter toolbar for the Stock
 * Transfer list. Native selects wrapped with a ChevronDownIcon per the UI
 * standard. Two-way binds `search`, `status`, `sourceOutlet`, and
 * `destinationOutlet` via v-model. Outlet options are resolved once by the
 * parent.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  TRANSFER_STATUSES,
  TRANSFER_STATUS_LABELS,
} from '@/services/stock-transfer.service'
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
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nomor / catatan..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="relative w-full sm:w-44">
      <select
        :value="status"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value as StatusFilter)"
      >
        <option value="all">Semua Status</option>
        <option v-for="s in TRANSFER_STATUSES" :key="s" :value="s">
          {{ TRANSFER_STATUS_LABELS[s] }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-52">
      <select
        :value="sourceOutlet"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:sourceOutlet', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Outlet Sumber</option>
        <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-52">
      <select
        :value="destinationOutlet"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:destinationOutlet', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Outlet Tujuan</option>
        <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
