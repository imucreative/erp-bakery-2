<script setup lang="ts">
/**
 * SalesOrderSummary — read-only header meta card for a Sales Order. Renders the
 * status badge, outlet, customer, invoice/order date, cashier, paid-at, and the
 * money breakdown (subtotal / order discount / tax / grand total). Outlet and
 * cashier ids resolve via injected callbacks.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah, formatDateTime } from '@/lib/format'
import {
  SALES_ORDER_STATUS_LABELS,
  salesOrderStatusBadgeColor,
  type SalesOrder,
} from '@/services/sales.service'

const props = defineProps<{
  order: SalesOrder
  outletName: (id: string) => string
  cashierName: (id: string) => string
}>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="salesOrderStatusBadgeColor(props.order.status)">
          {{ SALES_ORDER_STATUS_LABELS[props.order.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.outletName(props.order.outletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Customer</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.customerName || '—' }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Kasir</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.cashierName(props.order.cashierUserId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Order</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.order.orderDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibayar</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.paidAt ? formatDateTime(props.order.paidAt) : '—' }}
      </dd>
    </div>

    <div class="sm:col-span-2">
      <div class="mt-2 space-y-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div class="flex items-center justify-between text-theme-sm">
          <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
          <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.order.subtotal) }}</span>
        </div>
        <div class="flex items-center justify-between text-theme-sm">
          <span class="text-gray-500 dark:text-gray-400">Diskon Order</span>
          <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.order.orderDiscount) }}</span>
        </div>
        <div class="flex items-center justify-between text-theme-sm">
          <span class="text-gray-500 dark:text-gray-400">Pajak</span>
          <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.order.tax) }}</span>
        </div>
        <div
          class="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-800"
        >
          <span class="text-gray-800 dark:text-white/90">Grand Total</span>
          <span class="text-brand-600 dark:text-brand-400">{{ formatRupiah(props.order.grandTotal) }}</span>
        </div>
      </div>
    </div>
  </dl>
</template>
