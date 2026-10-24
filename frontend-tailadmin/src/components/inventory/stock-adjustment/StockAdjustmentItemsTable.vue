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
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
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
  <BaseTable aria-label="Item stock adjustment">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead>Arah</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead>Alasan</BaseTableHead>
        <BaseTableHead>Keterangan</BaseTableHead>
        <BaseTableHead v-if="showBalance" align="end">Sebelum</BaseTableHead>
        <BaseTableHead v-if="showBalance" align="end">Sesudah</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.adjustment.items" :key="item.id">
        <BaseTableCell emphasis="medium">
          {{ props.productName(item.productId) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ props.batchLabel(item.batchId) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="directionBadgeColor(item.direction)">
            {{ ADJUSTMENT_DIRECTION_LABELS[item.direction] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatNumber(item.qty) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ adjustmentReasonLabel(item.reason) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ item.reasonDescription || '-' }}
        </BaseTableCell>
        <BaseTableCell v-if="showBalance" align="end">
          {{ item.beforeQty !== null ? formatNumber(item.beforeQty) : '-' }}
        </BaseTableCell>
        <BaseTableCell v-if="showBalance" align="end" emphasis="medium">
          {{ item.afterQty !== null ? formatNumber(item.afterQty) : '-' }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
