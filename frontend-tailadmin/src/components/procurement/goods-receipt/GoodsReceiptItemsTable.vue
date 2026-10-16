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
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
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
  <BaseTable aria-label="Daftar item goods receipt">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead align="end">Dipesan</BaseTableHead>
        <BaseTableHead align="end">Diterima</BaseTableHead>
        <BaseTableHead align="end">Ditolak</BaseTableHead>
        <BaseTableHead>UOM</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead>Kadaluarsa</BaseTableHead>
        <BaseTableHead>Lot</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.gr.items" :key="item.id">
        <BaseTableCell emphasis="medium">{{ props.productName(item.productId) }}</BaseTableCell>
        <BaseTableCell align="end">{{ item.orderedQuantity }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ item.acceptedQuantity }}
          <span
            v-if="conversionHint(item)"
            class="mt-0.5 block text-theme-xs font-normal text-gray-400 dark:text-gray-500"
          >
            {{ conversionHint(item) }}
          </span>
        </BaseTableCell>
        <BaseTableCell align="end">{{ item.rejectedQuantity }}</BaseTableCell>
        <BaseTableCell>{{ props.uomName(item.uomId) }}</BaseTableCell>
        <BaseTableCell>{{ item.batchNumber || '-' }}</BaseTableCell>
        <BaseTableCell>{{ item.expiryDate ? formatDate(item.expiryDate) : '-' }}</BaseTableCell>
        <BaseTableCell>{{ item.lotNumber || '-' }}</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
