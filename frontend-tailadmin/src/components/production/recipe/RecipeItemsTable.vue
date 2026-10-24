<script setup lang="ts">
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatNumber } from '@/lib/format'
import type { Recipe } from '@/services/recipe.service'
const props = defineProps<{
  recipe: Recipe
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <BaseTable aria-label="Bahan resep">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Bahan</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead align="end">Loss %</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.recipe.items" :key="item.id">
        <BaseTableCell emphasis="medium">
          {{ props.productName(item.ingredientProductId) }}
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{ formatNumber(item.qty) }}</BaseTableCell>
        <BaseTableCell>{{ item.uomName || props.uomName(item.uomId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatNumber(item.lossPercentage) }}%</BaseTableCell>
      </BaseTableRow>
      <BaseTableRow v-if="props.recipe.items.length === 0">
        <BaseTableCell colspan="4" align="center">Resep ini tidak memiliki bahan.</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
