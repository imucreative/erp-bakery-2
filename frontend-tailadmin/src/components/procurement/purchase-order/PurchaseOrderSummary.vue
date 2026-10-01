<script setup lang="ts">
/**
 * PurchaseOrderSummary — read-only header meta card for a Purchase Order.
 * Renders the status badge, source PR, supplier, destination outlet, order
 * date, payment-term snapshot (code/name/due days), estimated payment due date,
 * totals (subtotal, tax, grand total) and optional notes. Pure presentation:
 * resolves ids → names via injected resolver callbacks so it never fetches or
 * holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseOrder,
} from '@/services/purchase-order.service'

const props = defineProps<{
  po: PurchaseOrder
  prNumber: (id: string) => string
  supplierName: (id: string) => string
  outletName: (id: string) => string
}>()

function paymentTermLabel(po: PurchaseOrder): string {
  if (!po.paymentTermName && !po.paymentTermCode) {
    return 'Tanpa termin'
  }
  const name = po.paymentTermName ?? po.paymentTermCode ?? '-'
  if (po.paymentTermDueDays !== null) {
    return `${name} (${po.paymentTermDueDays} hari)`
  }
  return name
}
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.po.status)">
          {{ PURCHASE_ORDER_STATUS_LABELS[props.po.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">PR Sumber</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.prNumber(props.po.purchaseRequestId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Vendor</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.supplierName(props.po.supplierId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet Tujuan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.outletName(props.po.destinationOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Order</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.po.orderDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Termin Pembayaran</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ paymentTermLabel(props.po) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Estimasi Jatuh Tempo</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.po.estimatedPaymentDueDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.po.createdAt) }}
      </dd>
    </div>

    <!-- Totals -->
    <div class="sm:col-span-2">
      <div class="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-gray-200 p-4 dark:border-gray-800 sm:grid-cols-3">
        <div>
          <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Subtotal</dt>
          <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatRupiah(props.po.totalAmount) }}
          </dd>
        </div>
        <div>
          <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Pajak</dt>
          <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatRupiah(props.po.taxTotal) }}
          </dd>
        </div>
        <div>
          <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Grand Total</dt>
          <dd class="mt-1 text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatRupiah(props.po.grandTotal) }}
          </dd>
        </div>
      </div>
    </div>

    <div v-if="props.po.notes" class="sm:col-span-2">
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Catatan</dt>
      <dd class="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{{ props.po.notes }}</dd>
    </div>
  </dl>
</template>
