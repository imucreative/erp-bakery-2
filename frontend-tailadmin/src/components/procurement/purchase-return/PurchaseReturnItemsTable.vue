<script setup lang="ts">
/**
 * PurchaseReturnItemsTable — read-only line-items table for a Purchase Return
 * detail view. Columns: Produk, Batch, Lot, Kadaluarsa, Jumlah Retur, UOM,
 * Alasan, Keterangan. Pure presentation: product/UOM ids resolve via injected
 * callbacks, though the line snapshot (`uomCode`) is preferred when present.
 */
import { formatDate } from '@/lib/format'
import {
  PURCHASE_RETURN_REASON_LABELS,
  type PurchaseReturn,
} from '@/services/purchase-return.service'

const props = defineProps<{
  pr: PurchaseReturn
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
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Batch
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Lot
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Kadaluarsa
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Jumlah Retur
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            UOM
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Alasan
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Keterangan
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
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.batchNumber || '-' }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.lotNumber || '-' }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.expiredDate ? formatDate(item.expiredDate) : '-' }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ item.returnQuantity }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.uomName || item.uomCode || props.uomName(item.uomId) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ PURCHASE_RETURN_REASON_LABELS[item.reason] }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.reasonDescription || '-' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
