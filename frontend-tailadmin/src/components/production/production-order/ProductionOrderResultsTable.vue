<script setup lang="ts">
/**
 * ProductionOrderResultsTable — read-only table of the finished-goods batches
 * produced by a completed production order. Columns: Produk, Nomor Batch,
 * Kedaluwarsa, Qty Diproduksi. Pure presentation: resolves product ids → names
 * via an injected resolver callback (the batch number is on the row itself).
 *
 * Results are populated only after a QA_PASSED completion; the parent renders
 * an empty-state message instead of this table when the list is empty (e.g.
 * QA_FAILED completion scraps the output, so no finished batch is produced).
 */
import { formatDate, formatNumber } from '@/lib/format'
import type { ProductionResult } from '@/services/production-order.service'

const props = defineProps<{
  results: ProductionResult[]
  productName: (id: string) => string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Produk Jadi
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Nomor Batch
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Kedaluwarsa
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty Diproduksi
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="result in props.results"
          :key="result.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(result.productId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ result.batchNumber }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatDate(result.expiredDate) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(result.qtyProduced) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
