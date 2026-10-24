<script setup lang="ts">
import { computed } from 'vue'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatNumber, formatDate } from '@/lib/format'
import type { StockTransfer } from '@/services/stock-transfer.service'

const props = defineProps<{ transfer: StockTransfer; productName: (id: string) => string }>()
const showDestination = computed<boolean>(() => props.transfer.status === 'COMPLETED')
</script>

<template>
  <BaseTable aria-label="Item stock transfer">
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Batch</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead v-if="showDestination">Batch Tujuan</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="item in props.transfer.items" :key="item.id">
        <BaseTableCell emphasis="medium">{{ props.productName(item.productId) }}</BaseTableCell>
        <BaseTableCell>
          <div class="flex flex-col gap-0.5">
            <span>{{ item.batchNumber || '(tanpa batch)' }}</span>
            <span class="text-muted-xs">
              <template v-if="item.lotNumber">Lot: {{ item.lotNumber }}</template>
              <template v-if="item.lotNumber && item.expiredDate">{{ ' · ' }}</template>
              <template v-if="item.expiredDate">Exp: {{ formatDate(item.expiredDate) }}</template>
            </span>
          </div>
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{ formatNumber(item.qty) }}</BaseTableCell>
        <BaseTableCell v-if="showDestination">{{ item.destinationBatchId ?? '-' }}</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
