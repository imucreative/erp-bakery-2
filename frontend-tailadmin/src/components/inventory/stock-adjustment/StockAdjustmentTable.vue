<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  STOCK_ADJUSTMENT_STATUS_LABELS,
  statusBadgeColor,
  type StockAdjustment,
} from '@/services/stock-adjustment.service'

defineProps<{
  items: StockAdjustment[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()

defineEmits<{ (event: 'view', adjustment: StockAdjustment): void }>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada penyesuaian stok."
    aria-label="Daftar stock adjustment"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor</BaseTableHead>
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead>Tanggal</BaseTableHead>
        <BaseTableHead align="end">Jumlah Item</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="adjustment in items" :key="adjustment.id">
        <BaseTableCell emphasis="medium">{{ adjustment.adjustmentNumber }}</BaseTableCell>
        <BaseTableCell>{{ outletName(adjustment.outletId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(adjustment.adjustmentDate) }}</BaseTableCell>
        <BaseTableCell align="end">{{ adjustment.items.length }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(adjustment.status)">
            {{ STOCK_ADJUSTMENT_STATUS_LABELS[adjustment.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="outline"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', adjustment)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
