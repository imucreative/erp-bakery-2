<script setup lang="ts">
/**
 * SalesOrderItemsTable — read-only line-items table for a Sales Order detail
 * view. Columns: Produk, Mode, Qty, Harga Satuan, Diskon, Total. Each item with
 * toppings renders topping sub-rows (name + extra price) beneath it. Uses
 * snapshot names from the entity, so no id→name resolver is needed.
 */
import Badge from '@/components/ui/Badge.vue'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatRupiah, formatNumber } from '@/lib/format'
import { SALE_MODE_LABELS, saleModeBadgeColor, type SalesOrder } from '@/services/sales.service'

const props = defineProps<{
  order: SalesOrder
}>()
</script>

<template>
  <BaseTable
    :is-empty="props.order.items.length === 0"
    empty-message="Belum ada item."
    aria-label="Daftar item sales order"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Mode</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead align="end">Harga Satuan</BaseTableHead>
        <BaseTableHead align="end">Diskon</BaseTableHead>
        <BaseTableHead align="end">Total</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <template v-for="item in props.order.items" :key="item.id">
        <BaseTableRow>
          <BaseTableCell emphasis="medium">{{ item.productNameSnapshot }}</BaseTableCell>
          <BaseTableCell>
            <Badge size="sm" :color="saleModeBadgeColor(item.saleMode)">
              {{ SALE_MODE_LABELS[item.saleMode] }}
            </Badge>
          </BaseTableCell>
          <BaseTableCell align="end">{{ formatNumber(item.qty) }}</BaseTableCell>
          <BaseTableCell align="end">{{ formatRupiah(item.unitPriceSnapshot) }}</BaseTableCell>
          <BaseTableCell align="end">{{ formatRupiah(item.itemDiscount) }}</BaseTableCell>
          <BaseTableCell align="end" emphasis="medium">
            {{ formatRupiah(item.lineTotal) }}
          </BaseTableCell>
        </BaseTableRow>
        <BaseTableRow v-for="topping in item.toppings" :key="topping.id">
          <BaseTableCell class="ps-8 pe-4 py-2 text-meta" colspan="5">
            + {{ topping.toppingNameSnapshot }}
            <span class="text-gray-400 dark:text-gray-500">
              (×{{ formatNumber(topping.qtyPerItem) }})
            </span>
          </BaseTableCell>
          <BaseTableCell align="end" class="py-2 text-meta">
            {{ formatRupiah(topping.extraPriceSnapshot) }}
          </BaseTableCell>
        </BaseTableRow>
      </template>
    </template>
  </BaseTable>
</template>
