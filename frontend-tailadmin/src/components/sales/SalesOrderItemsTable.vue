<script setup lang="ts">
/**
 * SalesOrderItemsTable — read-only line-items table for a Sales Order detail
 * view. Columns: Produk, Mode, Qty, Harga Satuan, Diskon, Total. Each item with
 * toppings renders topping sub-rows (name + extra price) beneath it. Uses
 * snapshot names from the entity, so no id→name resolver is needed.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah, formatNumber } from '@/lib/format'
import {
  SALE_MODE_LABELS,
  saleModeBadgeColor,
  type SalesOrder,
} from '@/services/sales.service'

const props = defineProps<{
  order: SalesOrder
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
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Mode
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Harga Satuan
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Diskon
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Total
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="item in props.order.items" :key="item.id">
          <tr class="border-b border-gray-100 last:border-0 dark:border-gray-800">
            <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
              {{ item.productNameSnapshot }}
            </td>
            <td class="px-4 py-3">
              <Badge size="sm" :color="saleModeBadgeColor(item.saleMode)">
                {{ SALE_MODE_LABELS[item.saleMode] }}
              </Badge>
            </td>
            <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatNumber(item.qty) }}
            </td>
            <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatRupiah(item.unitPriceSnapshot) }}
            </td>
            <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatRupiah(item.itemDiscount) }}
            </td>
            <td class="px-4 py-3 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ formatRupiah(item.lineTotal) }}
            </td>
          </tr>
          <tr
            v-for="topping in item.toppings"
            :key="topping.id"
            class="border-b border-gray-100 last:border-0 dark:border-gray-800"
          >
            <td
              class="ps-8 pe-4 py-2 text-theme-xs text-gray-500 dark:text-gray-400"
              colspan="5"
            >
              + {{ topping.toppingNameSnapshot }}
              <span class="text-gray-400 dark:text-gray-500">
                (×{{ formatNumber(topping.qtyPerItem) }})
              </span>
            </td>
            <td class="px-4 py-2 text-end text-theme-xs text-gray-500 dark:text-gray-400">
              {{ formatRupiah(topping.extraPriceSnapshot) }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
