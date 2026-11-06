<template>
  <ComponentCard title="Akan Kedaluwarsa" desc="Batch dengan expiry date ≤30 hari">
    <BaseTable
      :is-empty="items.length === 0"
      empty-message="Tidak ada batch yang akan kedaluwarsa"
      aria-label="Batch yang akan kedaluwarsa"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead>Batch</BaseTableHead>
          <BaseTableHead>Kedaluwarsa</BaseTableHead>
          <BaseTableHead align="end">Qty</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="item in items" :key="`${item.productId}-${item.batchNo}`">
          <BaseTableCell>{{ item.productName }}</BaseTableCell>
          <BaseTableCell>{{ item.batchNo }}</BaseTableCell>
          <BaseTableCell>{{ formatDate(item.expiryDate) }}</BaseTableCell>
          <BaseTableCell align="end">{{ item.qty }} {{ item.uomName }}</BaseTableCell>
        </BaseTableRow>
      </template>
    </BaseTable>
  </ComponentCard>
</template>

<script setup lang="ts">
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
import { formatDate } from '@/lib/format'

interface ExpiringSoonItem {
  productId: string
  productName: string
  batchNo: string
  expiryDate: string
  qty: number
  uomName: string
}

defineProps<{ items: ExpiringSoonItem[] }>()
</script>
