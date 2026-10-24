<script setup lang="ts">
/**
 * PurchaseReturnFilterBar — search (returnNumber/notes) + status filter +
 * source-GR filter + supplier filter toolbar for the Purchase Return list.
 * Native selects wrapped with a ChevronDownIcon per the UI standard. Two-way
 * binds `search`, `status`, `goodsReceipt`, and `supplier` via
 * v-model:search / v-model:status / v-model:goodsReceipt / v-model:supplier.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
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

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  ...PURCHASE_RETURN_STATUSES.map((status) => ({
    value: status,
    label: PURCHASE_RETURN_STATUS_LABELS[status],
  })),
]
</script>

<template>
  <div class="stack-row">
    <div class="relative w-full sm:max-w-xs">
      <BaseInput
        id="purchase-return-search"
        :model-value="search"
        placeholder="Cari nomor retur / catatan..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <BaseSelect
        id="purchase-return-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="purchase-return-goods-receipt"
        :model-value="goodsReceipt"
        :options="[
          { value: '', label: 'Semua GR' },
          ...goodsReceipts.map((gr) => ({ value: gr.id, label: gr.grNumber })),
        ]"
        @update:model-value="emit('update:goodsReceipt', $event)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="purchase-return-supplier"
        :model-value="supplier"
        :options="[
          { value: '', label: 'Semua Vendor' },
          ...suppliers.map((s) => ({ value: s.id, label: s.name })),
        ]"
        @update:model-value="emit('update:supplier', $event)"
      />
    </div>
  </div>
</template>
