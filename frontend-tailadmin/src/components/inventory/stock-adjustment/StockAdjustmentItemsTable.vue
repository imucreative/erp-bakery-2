<script setup lang="ts">
/**
 * StockAdjustmentItemsTable — read-only line-items table for a Stock Adjustment
 * detail view. Columns: Produk, Batch, Arah, Qty, Alasan, Keterangan, and the
 * before→after balance (shown only once the adjustment is COMPLETED, since
 * `beforeQty`/`afterQty` are filled by the posting transaction). Pure
 * presentation: resolves product/batch ids → names via injected resolver
 * callbacks.
 */
import { computed } from 'vue'
import Badge from '@/components/ui/Badge.vue'
import { formatNumber } from '@/lib/format'
import {
  ADJUSTMENT_DIRECTION_LABELS,
  adjustmentReasonLabel,
  directionBadgeColor,
  type StockAdjustment,
} from '@/services/stock-adjustment.service'

const props = defineProps<{
  adjustment: StockAdjustment
  productName: (id: string) => string
  batchLabel: (id: string) => string
}>()

/** Show the before→after columns only once the posting has filled them. */
const showBalance = computed<boolean>(() => props.adjustment.status === 'COMPLETED')
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
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Arah
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Alasan
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Keterangan
          </th>
          <th
            v-if="showBalance"
            class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
          >
            Sebelum
          </th>
          <th
            v-if="showBalance"
            class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
          >
            Sesudah
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.adjustment.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.productId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ props.batchLabel(item.batchId) }}
          </td>
          <td class="px-4 py-3">
            <Badge :color="directionBadgeColor(item.direction)">
              {{ ADJUSTMENT_DIRECTION_LABELS[item.direction] }}
            </Badge>
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(item.qty) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ adjustmentReasonLabel(item.reason) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.reasonDescription || '-' }}
          </td>
          <td
            v-if="showBalance"
            class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300"
          >
            {{ item.beforeQty !== null ? formatNumber(item.beforeQty) : '-' }}
          </td>
          <td
            v-if="showBalance"
            class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90"
          >
            {{ item.afterQty !== null ? formatNumber(item.afterQty) : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
