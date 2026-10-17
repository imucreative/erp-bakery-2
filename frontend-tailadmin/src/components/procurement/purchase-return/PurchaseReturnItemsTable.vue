<script setup lang="ts">
import { formatDate } from '@/lib/format'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import {
  PURCHASE_RETURN_REASON_LABELS,
  type PurchaseReturn,
} from '@/services/purchase-return.service'

const props = defineProps<{
  pr: PurchaseReturn
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <BaseTable aria-label="Daftar item purchase return">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead>Lot</BaseTableHead>
        <BaseTableHead>Kadaluarsa</BaseTableHead>
        <BaseTableHead align="end">Jumlah Retur</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead>Alasan</BaseTableHead>
        <BaseTableHead>Keterangan</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.pr.items" :key="item.id">
        <BaseTableCell emphasis="medium">{{ props.productName(item.productId) }}</BaseTableCell>
        <BaseTableCell>{{ item.batchNumber || '-' }}</BaseTableCell>
        <BaseTableCell>{{ item.lotNumber || '-' }}</BaseTableCell>
        <BaseTableCell>{{ item.expiredDate ? formatDate(item.expiredDate) : '-' }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{ item.returnQuantity }}</BaseTableCell>
        <BaseTableCell>{{
          item.uomName || item.uomCode || props.uomName(item.uomId)
        }}</BaseTableCell>
        <BaseTableCell>{{ PURCHASE_RETURN_REASON_LABELS[item.reason] }}</BaseTableCell>
        <BaseTableCell>{{ item.reasonDescription || '-' }}</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
