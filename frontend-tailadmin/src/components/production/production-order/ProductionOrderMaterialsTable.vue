<script setup lang="ts">
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import type { ProductionMaterial } from '@/services/production-order.service'
const props = defineProps<{
  materials: ProductionMaterial[]
  productName: (id: string) => string
  batchLabel: (id: string) => string
}>()
</script>

<template>
  <BaseTable aria-label="Bahan produksi yang dikonsumsi">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Bahan Baku</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead align="end">Qty Rencana</BaseTableHead>
        <BaseTableHead align="end">Qty Dikonsumsi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="material in props.materials" :key="material.id">
        <BaseTableCell emphasis="medium">
          {{ material.productName || props.productName(material.productId) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ material.batchNumber || props.batchLabel(material.batchId) }}
        </BaseTableCell>
        <BaseTableCell align="end">{{ formatNumber(material.plannedQty) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatNumber(material.qtyConsumed) }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
