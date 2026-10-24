<script setup lang="ts">
/**
 * SalesOrderTable — presentational table for the Sales Order list. Columns:
 * Invoice, Outlet, Customer, Tanggal, Jml Item, Total, Status (badge). Row
 * action is icon-only (view/detail). Renders loading / error / empty states.
 * Outlet names resolve via an injected callback.
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatRupiah, formatDateTime } from '@/lib/format'
import {
  SALES_ORDER_STATUS_LABELS,
  salesOrderStatusBadgeColor,
  type SalesOrder,
} from '@/services/sales.service'

const props = defineProps<{
  items: SalesOrder[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', order: SalesOrder): void
}>()
</script>

<template>
  <BaseTable
    :loading="props.loading"
    :error-message="props.errorMessage"
    :is-empty="props.items.length === 0"
    empty-message="Belum ada sales order."
    aria-label="Daftar sales order"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Invoice</BaseTableHead>
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead>Customer</BaseTableHead>
        <BaseTableHead>Tanggal</BaseTableHead>
        <BaseTableHead align="end">Jml Item</BaseTableHead>
        <BaseTableHead align="end">Total</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="order in props.items" :key="order.id">
        <BaseTableCell emphasis="medium">{{ order.invoiceNumber }}</BaseTableCell>
        <BaseTableCell>{{ order.outletName || props.outletName(order.outletId) }}</BaseTableCell>
        <BaseTableCell>{{ order.customerName || '—' }}</BaseTableCell>
        <BaseTableCell>{{ formatDateTime(order.orderDate) }}</BaseTableCell>
        <BaseTableCell align="end">{{ order.itemCount }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(order.grandTotal) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="salesOrderStatusBadgeColor(order.status)">
            {{ SALES_ORDER_STATUS_LABELS[order.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              variant="info"
              icon-only
              aria-label="Lihat detail"
              title="Lihat detail"
              @click="$emit('view', order)"
            >
              <Eye class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
