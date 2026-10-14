<script setup lang="ts">
/**
 * ProductionOrderMaterialsTable — read-only table of the ingredients consumed
 * (backflushed) by a completed production order. Columns: Produk, Batch, Qty
 * Rencana, Qty Dikonsumsi. Pure presentation: resolves product/batch ids →
 * labels via injected resolver callbacks.
 *
 * Material names and batch numbers come from the order detail; callbacks remain
 * as fallbacks for older API responses.
 */
import { formatNumber } from '@/lib/format'
import type { ProductionMaterial } from '@/services/production-order.service'

const props = defineProps<{
  materials: ProductionMaterial[]
  productName: (id: string) => string
  batchLabel: (id: string) => string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Bahan Baku
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Batch
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty Rencana
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty Dikonsumsi
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="material in props.materials"
          :key="material.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ material.productName || props.productName(material.productId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ material.batchNumber || props.batchLabel(material.batchId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatNumber(material.plannedQty) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(material.qtyConsumed) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
