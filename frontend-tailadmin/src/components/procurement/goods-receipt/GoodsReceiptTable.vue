<script setup lang="ts">
/**
 * GoodsReceiptTable — presentational table for the GR list. Columns:
 * GR Number, PO sumber, Supplier, Receive Date, Status (badge). Row action is
 * icon-only (view/detail). Renders loading / error / empty states. PO numbers
 * and supplier names are resolved by the parent via injected resolver
 * callbacks (fetched once for the whole page).
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  GOODS_RECEIPT_STATUS_LABELS,
  statusBadgeColor,
  type GoodsReceipt,
} from '@/services/goods-receipt.service'

defineProps<{
  items: GoodsReceipt[]
  loading: boolean
  errorMessage: string | null
  poNumber: (id: string) => string
  supplierName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', gr: GoodsReceipt): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada goods receipt."
    aria-label="Daftar goods receipt"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor GR</BaseTableHead>
        <BaseTableHead>PO Sumber</BaseTableHead>
        <BaseTableHead>Vendor</BaseTableHead>
        <BaseTableHead>Tanggal Terima</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="gr in items" :key="gr.id">
        <BaseTableCell emphasis="medium">{{ gr.grNumber }}</BaseTableCell>
        <BaseTableCell>{{ poNumber(gr.purchaseOrderId) }}</BaseTableCell>
        <BaseTableCell>{{ supplierName(gr.supplierId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(gr.receiveDate) }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(gr.status)">
            {{ GOODS_RECEIPT_STATUS_LABELS[gr.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="info"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', gr)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
