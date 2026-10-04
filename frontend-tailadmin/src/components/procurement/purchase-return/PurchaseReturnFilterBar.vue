<script setup lang="ts">
/**
 * PurchaseReturnFilterBar — search (returnNumber/notes) + status filter +
 * source-GR filter + supplier filter toolbar for the Purchase Return list.
 * Native selects wrapped with a ChevronDownIcon per the UI standard. Two-way
 * binds `search`, `status`, `goodsReceipt`, and `supplier` via
 * v-model:search / v-model:status / v-model:goodsReceipt / v-model:supplier.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
} from '@/services/purchase-return.service'
import type { StatusFilter } from '@/composables/usePurchaseReturns'
import type { GoodsReceipt } from '@/services/goods-receipt.service'
import type { Supplier } from '@/services/supplier.service'

defineProps<{
  search: string
  status: StatusFilter
  goodsReceipt: string
  supplier: string
  goodsReceipts: GoodsReceipt[]
  suppliers: Supplier[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:goodsReceipt', value: string): void
  (event: 'update:supplier', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nomor retur / catatan..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <select
        :value="status"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value as StatusFilter)"
      >
        <option value="all">Semua Status</option>
        <option v-for="s in PURCHASE_RETURN_STATUSES" :key="s" :value="s">
          {{ PURCHASE_RETURN_STATUS_LABELS[s] }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <select
        :value="goodsReceipt"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:goodsReceipt', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua GR</option>
        <option v-for="gr in goodsReceipts" :key="gr.id" :value="gr.id">{{ gr.grNumber }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <select
        :value="supplier"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:supplier', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Vendor</option>
        <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
