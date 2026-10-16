<script setup lang="ts">
/**
 * PurchaseOrderTable — presentational table for the PO list. Columns:
 * PO Number, PR sumber, Supplier, Order Date, Grand Total (Rp), Status (badge).
 * Row action is icon-only (view/detail). Renders loading / error / empty
 * states. PR number and supplier names are resolved by the parent via injected
 * resolver callbacks (fetched once for the whole page).
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate, formatRupiah } from '@/lib/format'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseOrder,
} from '@/services/purchase-order.service'

defineProps<{
  items: PurchaseOrder[]
  loading: boolean
  errorMessage: string | null
  prNumber: (id: string) => string
  supplierName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', po: PurchaseOrder): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada purchase order."
    aria-label="Daftar purchase order"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor PO</BaseTableHead>
        <BaseTableHead>PR Sumber</BaseTableHead>
        <BaseTableHead>Vendor</BaseTableHead>
        <BaseTableHead>Tanggal Order</BaseTableHead>
        <BaseTableHead align="end">Grand Total</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="po in items" :key="po.id">
        <BaseTableCell emphasis="medium">{{ po.poNumber }}</BaseTableCell>
        <BaseTableCell>{{ prNumber(po.purchaseRequestId) }}</BaseTableCell>
        <BaseTableCell>{{ supplierName(po.supplierId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(po.orderDate) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(po.grandTotal) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(po.status)">
            {{ PURCHASE_ORDER_STATUS_LABELS[po.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="info"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', po)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
