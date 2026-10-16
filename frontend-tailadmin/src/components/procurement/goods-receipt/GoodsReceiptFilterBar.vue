<script setup lang="ts">
/**
 * GoodsReceiptFilterBar — search (grNumber) + status filter + source-PO filter
 * toolbar for the GR list. Native selects wrapped with a ChevronDownIcon per
 * the UI standard. Two-way binds `search`, `status`, and `purchaseOrder` via
 * v-model:search / v-model:status / v-model:purchaseOrder.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import {
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
      <BaseInput
        id="goods-receipt-search"
        :model-value="search"
        placeholder="Cari nomor GR..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <BaseSelect
        id="goods-receipt-status"
        :model-value="status"
        :options="[
          { value: 'all', label: 'Semua Status' },
          ...Object.entries(GOODS_RECEIPT_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        ]"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="goods-receipt-purchase-order"
        :model-value="purchaseOrder"
        :options="[
          { value: '', label: 'Semua PO' },
          ...purchaseOrders.map((po) => ({ value: po.id, label: po.poNumber })),
        ]"
        @update:model-value="emit('update:purchaseOrder', $event)"
      />
    </div>
  </div>
</template>
