<script setup lang="ts">
/**
 * BatchFilterBar — outlet + product + batch-status filters plus an
 * "include non-batch" toggle for the Batch & Expiry list. The three dropdowns
 * are native selects wrapped with a ChevronDownIcon per the UI standard; the
 * boolean uses ToggleSwitch (never a checkbox). Two-way binds `outletId`,
 * `productId`, `status`, and `includeNonBatch`. Outlet and product options are
 * resolved once by the parent.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { BATCH_STATUSES, batchStatusLabel } from '@/services/inventory.service'

interface OutletOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

defineProps<{
  outletId: string
  productId: string
  status: string
  includeNonBatch: boolean
  outlets: OutletOption[]
  products: ProductOption[]
}>()

const emit = defineEmits<{
  (event: 'update:outletId', value: string): void
  (event: 'update:productId', value: string): void
  (event: 'update:status', value: string): void
  (event: 'update:includeNonBatch', value: boolean): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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

    <div class="relative w-full sm:w-64">
      <select
        :value="productId"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:productId', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Produk</option>
        <option v-for="product in products" :key="product.id" :value="product.id">
          {{ product.name }} ({{ product.sku }})
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>

    <div class="relative w-full sm:w-48">
      <select
        :value="status"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Status</option>
        <option v-for="s in BATCH_STATUSES" :key="s" :value="s">
          {{ batchStatusLabel(s) }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>

    <ToggleSwitch
      :model-value="includeNonBatch"
      label="Tampilkan non-batch"
      @update:model-value="emit('update:includeNonBatch', $event)"
    />
  </div>
</template>
