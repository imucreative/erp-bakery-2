<script setup lang="ts">
/**
 * StockOnHandTable — presentational, read-only table for the Stock On Hand
 * list. Columns: Produk (name + SKU), Outlet, Qty Tersedia, Minimum Stock,
 * Status. Quantities are shown with the product's base unit of measure (from
 * the backend row). A warning "Rendah" badge is shown when `isLow` is true.
 * Renders loading / error / empty states. No row actions (read-only view).
 */
import Badge from '@/components/ui/Badge.vue'
import { formatQtyWithUom } from '@/lib/format'
import type { StockOnHandRow } from '@/services/inventory.service'

defineProps<{
  items: StockOnHandRow[]
  loading: boolean
  errorMessage: string | null
}>()

/** Short, readable unit label: prefer the UOM code, fall back to the name. */
function uomLabel(row: StockOnHandRow): string {
  return row.uomCode || row.uomName
}
</script>

<template>
  <div>
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Belum ada data stok.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Outlet
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty Tersedia
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Minimum Stock
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="`${row.productId}-${row.outletId}`"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4">
              <div class="flex flex-col">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ row.productName }}
                </span>
                <span class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ row.productSku }}
                </span>
              </div>
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.outletName }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ formatQtyWithUom(row.qtyAvailable, uomLabel(row)) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatQtyWithUom(row.minimumStock, uomLabel(row)) }}
            </td>
            <td class="px-5 py-4">
              <Badge v-if="row.isLow" color="warning">Rendah</Badge>
              <Badge v-else color="success">Normal</Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
