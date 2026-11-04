<template>
  <ComponentCard
    :title="`Produk Terlaris ${periodDays} Hari`"
    :desc="`Top ${topProductsLimit} produk dan kombinasi topping berdasarkan qty terjual`"
  >
    <BaseTable
      :is-empty="items.length === 0"
      empty-message="Belum ada data penjualan"
      aria-label="Produk terlaris"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead>Topping</BaseTableHead>
          <BaseTableHead align="end">Qty Terjual</BaseTableHead>
          <BaseTableHead align="end">Revenue</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow
          v-for="item in items"
          :key="JSON.stringify([item.productId, item.productName, item.toppingNames])"
        >
          <BaseTableCell>{{ item.productName }}</BaseTableCell>
          <BaseTableCell>
            {{ item.toppingNames.length ? item.toppingNames.join(' + ') : 'Tanpa topping' }}
          </BaseTableCell>
          <BaseTableCell align="end">{{ item.qtySold }}</BaseTableCell>
          <BaseTableCell align="end">{{ formatRupiah(item.revenue) }}</BaseTableCell>
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
import type { OwnerDashboardTopProductsLimit } from '@/services/dashboard.service'

interface TopProductItem {
  productId: string
  productName: string
  toppingNames: string[]
  qtySold: number
  revenue: number
}

defineProps<{
  items: TopProductItem[]
  periodDays: number
  topProductsLimit: OwnerDashboardTopProductsLimit
}>()
</script>
