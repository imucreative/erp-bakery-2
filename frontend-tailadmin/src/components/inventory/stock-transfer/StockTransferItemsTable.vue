<script setup lang="ts">
/**
 * StockTransferItemsTable — read-only line-items table for a Stock Transfer
 * detail view. Columns: Produk, Batch (batchNumber + lot/expiry), Qty, and —
 * once the transfer is received — Batch Tujuan (destinationBatchId). The item
 * detail from the backend is already rich (batchNumber, lotNumber, expiredDate),
 * so no batch lookup is needed; only the product id → name is resolved via an
 * injected resolver callback. `destinationBatchId` is shown as the destination
 * batch id when present (filled by the receive posting), otherwise a dash.
 */
import { computed } from 'vue'
import { formatNumber, formatDate } from '@/lib/format'
import type { StockTransfer } from '@/services/stock-transfer.service'

const props = defineProps<{
  transfer: StockTransfer
  productName: (id: string) => string
}>()

/** Show the destination-batch column only once the transfer is received. */
const showDestination = computed<boolean>(() => props.transfer.status === 'COMPLETED')
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Produk
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Batch
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty
          </th>
          <th
            v-if="showDestination"
            class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
          >
            Batch Tujuan
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.transfer.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.productId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            <div class="flex flex-col gap-0.5">
              <span>{{ item.batchNumber || '(tanpa batch)' }}</span>
              <span class="text-theme-xs text-gray-400 dark:text-gray-500">
                <template v-if="item.lotNumber">Lot: {{ item.lotNumber }}</template>
                <template v-if="item.lotNumber && item.expiredDate"> · </template>
                <template v-if="item.expiredDate">Exp: {{ formatDate(item.expiredDate) }}</template>
              </span>
            </div>
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(item.qty) }}
          </td>
          <td
            v-if="showDestination"
            class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300"
          >
            {{ item.destinationBatchId ?? '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
