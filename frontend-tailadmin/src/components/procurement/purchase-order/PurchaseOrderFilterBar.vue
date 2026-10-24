<script setup lang="ts">
/**
 * PurchaseOrderFilterBar — search (poNumber) + status filter + supplier filter
 * toolbar for the PO list. Native selects wrapped with a ChevronDownIcon per
 * the UI standard. Two-way binds `search`, `status`, and `supplier` via
 * v-model:search / v-model:status / v-model:supplier.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import {
  PURCHASE_ORDER_STATUSES,
  PURCHASE_ORDER_STATUS_LABELS,
} from '@/services/purchase-order.service'
import type { StatusFilter } from '@/composables/usePurchaseOrders'
import type { Supplier } from '@/services/supplier.service'

defineProps<{
  search: string
  status: StatusFilter
  supplier: string
  suppliers: Supplier[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:supplier', value: string): void
}>()

const statusOptions = [
  { value: 'all' as const, label: 'Semua Status' },
  ...PURCHASE_ORDER_STATUSES.map((status) => ({
    value: status,
    label: PURCHASE_ORDER_STATUS_LABELS[status],
  })),
]
</script>

<template>
  <div class="stack-row">
    <div class="relative w-full sm:max-w-xs">
      <BaseInput
        id="purchase-order-search"
        :model-value="search"
        placeholder="Cari nomor PO..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <BaseSelect
        id="purchase-order-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="purchase-order-supplier"
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
