<script setup lang="ts">
/**
 * PurchaseOrderItemsTable — read-only line-items table for a Purchase Order
 * detail view, with subtotal/tax/grand-total footer. Distinct from
 * PurchaseOrderItemsEditor (which is editable). Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks.
 */
import { formatRupiah } from '@/lib/format'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { PurchaseOrder } from '@/services/purchase-order.service'

const props = defineProps<{
  po: PurchaseOrder
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <BaseTable aria-label="Daftar item purchase order">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead align="end">Harga Satuan</BaseTableHead>
        <BaseTableHead align="end">Pajak %</BaseTableHead>
        <BaseTableHead align="end">Subtotal</BaseTableHead>
        <BaseTableHead align="end">Total</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.po.items" :key="item.id">
        <BaseTableCell emphasis="medium">{{ props.productName(item.productId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ item.quantity }}</BaseTableCell>
        <BaseTableCell>{{ props.uomName(item.uomId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(item.unitPrice) }}</BaseTableCell>
        <BaseTableCell align="end">{{ item.taxPercent }}%</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(item.subtotal) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{ formatRupiah(item.total) }}</BaseTableCell>
      </BaseTableRow>
    </template>
    <template #footer>
      <BaseTableRow>
        <BaseTableCell colspan="6" align="end" emphasis="medium">Subtotal</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(props.po.totalAmount) }}</BaseTableCell>
      </BaseTableRow>
      <BaseTableRow>
        <BaseTableCell colspan="6" align="end" emphasis="medium">Pajak</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(props.po.taxTotal) }}</BaseTableCell>
      </BaseTableRow>
      <BaseTableRow>
        <BaseTableCell colspan="6" align="end" emphasis="medium">Grand Total</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(props.po.grandTotal) }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
