<script setup lang="ts">
/**
 * GoodsReceiptFilterBar — search (grNumber) + status filter + source-PO filter
 * toolbar for the GR list. Native selects wrapped with a ChevronDownIcon per
 * the UI standard. Two-way binds `search`, `status`, and `purchaseOrder` via
 * v-model:search / v-model:status / v-model:purchaseOrder.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  GOODS_RECEIPT_STATUSES,
  GOODS_RECEIPT_STATUS_LABELS,
} from '@/services/goods-receipt.service'
import type { StatusFilter } from '@/composables/useGoodsReceipts'
import type { PurchaseOrder } from '@/services/purchase-order.service'

defineProps<{
  search: string
  status: StatusFilter
  purchaseOrder: string
  purchaseOrders: PurchaseOrder[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:purchaseOrder', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nomor GR..."
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
        <option v-for="s in GOODS_RECEIPT_STATUSES" :key="s" :value="s">
          {{ GOODS_RECEIPT_STATUS_LABELS[s] }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <select
        :value="purchaseOrder"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:purchaseOrder', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua PO</option>
        <option v-for="po in purchaseOrders" :key="po.id" :value="po.id">{{ po.poNumber }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
