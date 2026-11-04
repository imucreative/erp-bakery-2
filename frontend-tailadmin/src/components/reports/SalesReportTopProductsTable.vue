<template>
  <ComponentCard
    title="Top Selling Products"
    :desc="`Top ${appliedLimit} products and topping combinations by qty sold`"
  >
    <BaseTable
      :is-empty="rows.length === 0"
      empty-message="Tidak ada data produk."
      aria-label="Daftar produk terlaris"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Product</BaseTableHead>
          <BaseTableHead>Topping</BaseTableHead>
          <BaseTableHead align="end">Qty Sold</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead align="end">Revenue</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow
          v-for="row in rows"
          :key="JSON.stringify([row.productId, row.productName, row.toppingNames])"
        >
          <BaseTableCell>
            <span class="text-strong">{{ row.productName }}</span>
          </BaseTableCell>
          <BaseTableCell>
            {{ row.toppingNames.length ? row.toppingNames.join(' + ') : 'Tanpa topping' }}
          </BaseTableCell>
          <BaseTableCell align="end">{{ row.qtySold }}</BaseTableCell>
          <BaseTableCell>{{ row.uomName || '—' }}</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">{{ formatRupiah(row.revenue) }}</BaseTableCell>
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
import { formatRupiah } from '@/lib/format'
import type { SalesReportTopProduct } from '@/services/reports.service'

defineProps<{
  rows: SalesReportTopProduct[]
  appliedLimit: number
}>()
</script>
