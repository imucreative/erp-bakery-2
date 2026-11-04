<template>
  <ComponentCard title="Daily Breakdown" desc="Production per day per recipe">
    <BaseTable
      :is-empty="rows.length === 0"
      empty-message="Tidak ada data produksi."
      aria-label="Daftar produksi harian"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Date</BaseTableHead>
          <BaseTableHead>Outlet</BaseTableHead>
          <BaseTableHead>Recipe</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead align="end">Planned Qty</BaseTableHead>
          <BaseTableHead align="end">Produced Qty</BaseTableHead>
          <BaseTableHead align="end">Waste Qty</BaseTableHead>
          <BaseTableHead align="end">Yield</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="row in rows" :key="`${row.date}-${row.recipeId}`">
          <BaseTableCell>{{ formatDate(row.date) }}</BaseTableCell>
          <BaseTableCell>{{ row.outletName }}</BaseTableCell>
          <BaseTableCell>
            <span class="text-strong">{{ row.recipeName }}</span>
          </BaseTableCell>
          <BaseTableCell>{{ row.uomName || '—' }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.plannedQty }}</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">{{ row.producedQty }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.wasteQty }}</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">{{ row.yield.toFixed(1) }}%</BaseTableCell>
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
import type { ProductionReportDailyBreakdown } from '@/services/reports.service'

defineProps<{ rows: ProductionReportDailyBreakdown[] }>()
</script>
