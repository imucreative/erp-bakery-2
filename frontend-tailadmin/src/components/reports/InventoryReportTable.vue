<template>
  <ComponentCard title="Product Details" desc="Stock on hand per product">
    <BaseTable
      :is-empty="rows.length === 0"
      empty-message="Tidak ada data produk."
      aria-label="Daftar produk inventory"
    >
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Product</BaseTableHead>
          <BaseTableHead>SKU</BaseTableHead>
          <BaseTableHead align="end">Total Qty</BaseTableHead>
          <BaseTableHead align="end">Available Qty</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead align="end">Batches</BaseTableHead>
          <BaseTableHead>Earliest Expiry</BaseTableHead>
          <BaseTableHead align="end">Stock Value</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow v-for="row in rows" :key="row.productId">
          <BaseTableCell>
            <span class="text-strong">{{ row.productName }}</span>
          </BaseTableCell>
          <BaseTableCell>
            <span class="text-meta">{{ row.sku }}</span>
          </BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">{{ row.totalQty.toFixed(0) }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.availableQty.toFixed(0) }}</BaseTableCell>
          <BaseTableCell>{{ row.uomName || '—' }}</BaseTableCell>
          <BaseTableCell align="end">{{ row.batchCount }}</BaseTableCell>
          <BaseTableCell>
            {{ row.earliestExpiry ? formatDate(row.earliestExpiry) : 'N/A' }}
          </BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">
            {{ formatRupiah(row.stockValue) }}
          </BaseTableCell>
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
import type { InventoryReportProductRow } from '@/services/reports.service'

defineProps<{ rows: InventoryReportProductRow[] }>()
</script>
