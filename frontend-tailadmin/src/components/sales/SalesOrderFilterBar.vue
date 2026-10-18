<script setup lang="ts">
/**
 * SalesOrderFilterBar — search (invoiceNumber) + status + outlet + shift filter
 * toolbar for the Sales Order list. Native selects wrapped with a
 * ChevronDownIcon per the UI standard. Two-way binds `search`, `status`,
 * `outlet`, and `shift`.
 */
import { computed } from 'vue'
import {
  SALES_ORDER_STATUSES,
  SALES_ORDER_STATUS_LABELS,
  type Shift,
} from '@/services/sales.service'
import type { SalesOrderStatusFilter } from '@/composables/useSalesOrders'
import type { Outlet } from '@/services/outlet.service'
import BaseInput from '../ui/BaseInput.vue'
import BaseSelect from '../ui/BaseSelect.vue'

const props = defineProps<{
  search: string
  status: SalesOrderStatusFilter
  outlet: string
  shift: string
  outlets: Outlet[]
  shifts: Shift[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: SalesOrderStatusFilter): void
  (event: 'update:outlet', value: string): void
  (event: 'update:shift', value: string): void
}>()

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  ...SALES_ORDER_STATUSES.map((status) => ({
    value: status,
    label: SALES_ORDER_STATUS_LABELS[status],
  })),
]

const distinctShifts = computed<Shift[]>(() => {
  const seenCashiers = new Set<string>()

  return props.shifts.filter((shift) => {
    const cashierKey = shift.cashierUserId || shift.cashierName || shift.id
    if (seenCashiers.has(cashierKey)) {
      return false
    }
    seenCashiers.add(cashierKey)
    return true
  })
})

const outletsOptions = [
  { value: '', label: 'Semua Outlet' },
  ...props.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name })),
]

const shiftsOptions = [
  { value: '', label: 'Semua Shift' },
  ...distinctShifts.value.map((shift) => ({
    value: shift.id,
    label: `${shift.cashierName || 'Unknown Cashier'}`,
  })),
]
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <BaseInput
        id="sales-order-search"
        :model-value="search"
        placeholder="Cari nomor invoice..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <BaseSelect
        id="sales-order-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as SalesOrderStatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="sales-order-outlet"
        :model-value="outlet"
        :options="outletsOptions"
        @update:model-value="emit('update:outlet', $event as SalesOrderStatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <BaseSelect
        id="sales-order-shift"
        :model-value="shift"
        :options="shiftsOptions"
        @update:model-value="emit('update:shift', $event as SalesOrderStatusFilter)"
      />
    </div>
  </div>
</template>
