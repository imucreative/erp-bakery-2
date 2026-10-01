<script setup lang="ts">
/**
 * PurchaseOrderItemsTable — read-only line-items table for a Purchase Order
 * detail view, with subtotal/tax/grand-total footer. Distinct from
 * PurchaseOrderItemsEditor (which is editable). Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks.
 */
import { formatRupiah } from '@/lib/format'
import type { PurchaseOrder } from '@/services/purchase-order.service'

const props = defineProps<{
  po: PurchaseOrder
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
            Harga Satuan
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Pajak %
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Subtotal
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.po.items"
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
            {{ formatRupiah(item.unitPrice) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.taxPercent }}%
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatRupiah(item.subtotal) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatRupiah(item.total) }}
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr class="border-t border-gray-100 dark:border-gray-800">
          <td colspan="5" class="px-4 py-2 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300">
            Subtotal
          </td>
          <td class="px-4 py-2 text-end text-theme-sm text-gray-700 dark:text-gray-300">
            {{ formatRupiah(props.po.totalAmount) }}
          </td>
          <td></td>
        </tr>
        <tr>
          <td colspan="5" class="px-4 py-2 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300">
            Pajak
          </td>
          <td class="px-4 py-2 text-end text-theme-sm text-gray-700 dark:text-gray-300">
            {{ formatRupiah(props.po.taxTotal) }}
          </td>
          <td></td>
        </tr>
        <tr class="border-t border-gray-200 dark:border-gray-800">
          <td colspan="5" class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-700 dark:text-gray-200">
            Grand Total
          </td>
          <td class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatRupiah(props.po.grandTotal) }}
          </td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
