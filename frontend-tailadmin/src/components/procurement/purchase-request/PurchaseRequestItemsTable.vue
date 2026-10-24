<script setup lang="ts">
/**
 * PurchaseRequestItemsTable — read-only line-items table for a Purchase
 * Request detail view, with an estimated-total footer. Distinct from
 * PurchaseRequestItemsEditor (which is editable). Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks.
 */
import { formatRupiah } from '@/lib/format'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { PurchaseRequest } from '@/services/purchase-request.service'

const props = defineProps<{
  pr: PurchaseRequest
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <BaseTable aria-label="Daftar item purchase request">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead align="end">Estimasi Harga</BaseTableHead>
        <BaseTableHead align="end">Subtotal</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.pr.items" :key="item.id">
        <BaseTableCell emphasis="medium">{{ props.productName(item.productId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ item.quantity }}</BaseTableCell>
        <BaseTableCell>{{ props.uomName(item.uomId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(item.estimatedPrice) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(item.subtotal) }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
    <template #footer>
      <BaseTableRow>
        <BaseTableCell colspan="4" align="end" emphasis="medium">Total Estimasi</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(props.pr.totalEstimatedAmount) }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
