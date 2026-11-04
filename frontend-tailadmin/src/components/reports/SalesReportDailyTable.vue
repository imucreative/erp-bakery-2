<template>
  <ComponentCard title="Daily Breakdown" desc="Sales per day per outlet">
    <BaseTable
      :is-empty="rows.length === 0"
      empty-message="Tidak ada data penjualan."
      aria-label="Daftar penjualan harian"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Date</BaseTableHead>
          <BaseTableHead>Outlet</BaseTableHead>
          <BaseTableHead align="end">Orders</BaseTableHead>
          <BaseTableHead align="end">Revenue</BaseTableHead>
          <BaseTableHead align="end">Items Sold</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="row in rows" :key="`${row.date}-${row.outletId}`">
          <BaseTableCell>{{ formatDate(row.date) }}</BaseTableCell>
          <BaseTableCell>{{ row.outletName }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.orderCount }}</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">{{ formatRupiah(row.revenue) }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.itemsSold }}</BaseTableCell>
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
import { formatDate, formatRupiah } from '@/lib/format'
import type { SalesReportDailyBreakdown } from '@/services/reports.service'

defineProps<{ rows: SalesReportDailyBreakdown[] }>()
</script>
