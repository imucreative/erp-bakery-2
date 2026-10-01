<script setup lang="ts">
/**
 * GoodsReceiptItemsTable — read-only line-items table for a Goods Receipt
 * detail view. Columns: Produk, Dipesan, Diterima, Ditolak, UOM, Batch,
 * Kadaluarsa, Lot. Distinct from GoodsReceiptItemsEditor (which is editable).
 * Pure presentation: resolves product/UOM ids → names via injected resolver
 * callbacks.
 */
import { formatDate } from '@/lib/format'
import type { GoodsReceipt } from '@/services/goods-receipt.service'

const props = defineProps<{
  gr: GoodsReceipt
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Produk
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Dipesan
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Diterima
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Ditolak
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            UOM
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Batch
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Kadaluarsa
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Lot
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.gr.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.productId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.orderedQuantity }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ item.acceptedQuantity }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.rejectedQuantity }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ props.uomName(item.uomId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.batchNumber || '-' }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.expiryDate ? formatDate(item.expiryDate) : '-' }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.lotNumber || '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
