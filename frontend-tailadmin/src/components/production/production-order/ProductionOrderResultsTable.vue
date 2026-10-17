<script setup lang="ts">
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate, formatNumber } from '@/lib/format'
import type { ProductionResult } from '@/services/production-order.service'
const props = defineProps<{ results: ProductionResult[]; productName: (id: string) => string }>()
</script>

<template>
  <BaseTable aria-label="Hasil produksi">
    <template #header
      ><BaseTableRow variant="header"
        ><BaseTableHead>Produk Jadi</BaseTableHead><BaseTableHead>Nomor Batch</BaseTableHead
        ><BaseTableHead>Kedaluwarsa</BaseTableHead
        ><BaseTableHead align="end">Qty Diproduksi</BaseTableHead></BaseTableRow
      ></template
    >
    <template #body>
      <BaseTableRow v-for="result in props.results" :key="result.id">
        <BaseTableCell emphasis="medium">{{ props.productName(result.productId) }}</BaseTableCell>
        <BaseTableCell>{{ result.batchNumber }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(result.expiredDate) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{
          formatNumber(result.qtyProduced)
        }}</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
