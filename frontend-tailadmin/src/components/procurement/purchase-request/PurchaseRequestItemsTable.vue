<script setup lang="ts">
/**
 * PurchaseRequestItemsTable — read-only line-items table for a Purchase
 * Request detail view, with an estimated-total footer. Distinct from
 * PurchaseRequestItemsEditor (which is editable). Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks.
 */
import { formatRupiah } from '@/lib/format'
import type { PurchaseRequest } from '@/services/purchase-request.service'

const props = defineProps<{
  pr: PurchaseRequest
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
            Qty
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            UOM
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Estimasi Harga
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Subtotal
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.pr.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.productId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.quantity }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ props.uomName(item.uomId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatRupiah(item.estimatedPrice) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatRupiah(item.subtotal) }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="border-t border-gray-200 dark:border-gray-800">
          <td
            colspan="4"
            class="px-4 py-3 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300"
          >
            Total Estimasi
          </td>
          <td class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatRupiah(props.pr.totalEstimatedAmount) }}
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
