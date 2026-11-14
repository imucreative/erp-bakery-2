<script setup lang="ts">
/**
 * GoodsReceiptFilterBar — search (grNumber) + status filter + source-PO filter
 * toolbar for the GR list. Status uses a native select wrapped with a
 * ChevronDownIcon per the UI standard; source PO is a client-side autocomplete
 * (`EntityCombobox`) over the locally loaded PO list, where an empty selection
 * means "Semua PO". Two-way binds `search`, `status`, and `purchaseOrder` via
 * v-model:search / v-model:status / v-model:purchaseOrder.
 */
import { computed } from 'vue'
import { BaseInput, BaseSelect } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { GOODS_RECEIPT_STATUS_LABELS } from '@/services/goods-receipt.service'
import type { StatusFilter } from '@/composables/useGoodsReceipts'
import type { PurchaseOrder } from '@/services/purchase-order.service'

const props = defineProps<{
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

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  ...Object.entries(GOODS_RECEIPT_STATUS_LABELS).map(([value, label]) => ({
    value,
    label,
  })),
]

const selectedPurchaseOrderLabel = computed<string>(() => {
  const match = props.purchaseOrders.find((po) => po.id === props.purchaseOrder)
  return match?.poNumber ?? ''
})
</script>

<template>
  <div class="stack-row">
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
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-72">
      <EntityCombobox
        :model-value="purchaseOrder"
        mode="client"
        list-width="content"
        :selected-label="selectedPurchaseOrderLabel"
        :items="purchaseOrders"
        :item-id="(po: PurchaseOrder) => po.id"
        :item-label="(po: PurchaseOrder) => po.poNumber"
        empty-text="PO tidak ditemukan."
        placeholder="Semua PO"
        aria-label="Filter PO sumber"
        @update:model-value="emit('update:purchaseOrder', $event)"
      />
    </div>
  </div>
</template>
