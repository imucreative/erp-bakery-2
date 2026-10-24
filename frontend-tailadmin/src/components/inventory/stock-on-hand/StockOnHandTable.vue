<script setup lang="ts">
/**
 * StockOnHandTable — presentational, read-only table for the Stock On Hand
 * list. Columns: Produk (name + SKU), Outlet, Qty Tersedia, Minimum Stock,
 * Status. Quantities are shown with the product's base unit of measure (from
 * the backend row). A warning "Rendah" badge is shown when `isLow` is true.
 * Renders loading / error / empty states. No row actions (read-only view).
 */
import Badge from '@/components/ui/Badge.vue'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatQtyWithUom } from '@/lib/format'
import type { StockOnHandRow } from '@/services/inventory.service'

defineProps<{
  items: StockOnHandRow[]
  loading: boolean
  errorMessage: string | null
}>()

/** Short, readable unit label: prefer the UOM code, fall back to the name. */
function uomLabel(row: StockOnHandRow): string {
  return row.uomName
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada data stok."
    aria-label="Daftar stock on hand"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead align="end">Qty Tersedia</BaseTableHead>
        <BaseTableHead align="end">Minimum Stock</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="row in items" :key="`${row.productId}-${row.outletId}`">
        <BaseTableCell>
          <div class="flex flex-col">
            <span class="text-strong">
              {{ row.productName }}
            </span>
            <span class="text-theme-xs text-gray-500 dark:text-gray-400">
              {{ row.productSku }}
            </span>
          </div>
        </BaseTableCell>
        <BaseTableCell>
          {{ row.outletName }}
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatQtyWithUom(row.qtyAvailable, uomLabel(row)) }}
        </BaseTableCell>
        <BaseTableCell align="end">
          {{ formatQtyWithUom(row.minimumStock, uomLabel(row)) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge v-if="row.isLow" color="warning">Rendah</Badge>
          <Badge v-else color="success">Normal</Badge>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
