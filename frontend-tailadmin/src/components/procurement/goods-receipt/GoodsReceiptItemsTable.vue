<script setup lang="ts">
/**
 * GoodsReceiptItemsTable — read-only line-items table for a Goods Receipt
 * detail view. Columns: Produk, Dipesan, Diterima, Ditolak, UOM, Batch,
 * Kadaluarsa, Lot. Distinct from GoodsReceiptItemsEditor (which is editable).
 * Pure presentation: resolves product/UOM ids → names via injected resolver
 * callbacks.
 *
 * UOM Conversion T2 (doc 50 §4/§8): the Diterima quantity stays in the line's
 * BUY unit (`uomId`, inherited from the PO). When the line's `conversionFactor`
 * differs from 1 the backend posts the converted amount to stock, so under the
 * Diterima cell we show an INFORMATIVE "≈ accepted × factor [base unit]" hint.
 * The number is read straight from the server-side snapshot — the client never
 * computes stock itself; this is purely for clarity.
 */
import { formatDate } from '@/lib/format'
import type { GoodsReceipt, GoodsReceiptItem } from '@/services/goods-receipt.service'

const props = defineProps<{
  gr: GoodsReceipt
  productName: (id: string) => string
  uomName: (id: string) => string
  /**
   * Resolver: product id → its base-unit UOM name (the unit stock is kept in).
   * Returns null when unknown or when it equals the line unit (no hint shown).
   */
  baseUomName: (productId: string) => string | null
}>()

/** Number formatter that trims trailing zeros (e.g. 25000, 7.5). */
const QTY_FORMAT = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 4 })

/**
 * Informative base-unit hint for a line, or null when there is nothing useful
 * to show (factor is 1/invalid, nothing accepted, or base unit unknown). The
 * value mirrors the backend snapshot: baseQty = acceptedQuantity × factor.
 */
function conversionHint(item: GoodsReceiptItem): string | null {
  const factor = Number(item.conversionFactor)
  const accepted = Number(item.acceptedQuantity)
  if (!(factor > 0) || factor === 1 || !(accepted > 0)) {
    return null
  }
  const baseUom = props.baseUomName(item.productId)
  if (!baseUom) {
    return null
  }
  const baseQty = QTY_FORMAT.format(accepted * factor)
  return `≈ ${baseQty} ${baseUom} masuk stok`
}
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
            <span
              v-if="conversionHint(item)"
              class="mt-0.5 block text-theme-xs font-normal text-gray-400 dark:text-gray-500"
            >
              {{ conversionHint(item) }}
            </span>
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
