<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  TRANSFER_STATUS_LABELS,
  statusBadgeColor,
  type StockTransfer,
} from '@/services/stock-transfer.service'

defineProps<{
  items: StockTransfer[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()
defineEmits<{ (event: 'view', transfer: StockTransfer): void }>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada transfer stok."
    aria-label="Daftar stock transfer"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor</BaseTableHead><BaseTableHead>Outlet Sumber</BaseTableHead
        ><BaseTableHead>Outlet Tujuan</BaseTableHead><BaseTableHead>Tanggal</BaseTableHead
        ><BaseTableHead align="end">Jumlah Item</BaseTableHead><BaseTableHead>Status</BaseTableHead
        ><BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="transfer in items" :key="transfer.id">
        <BaseTableCell emphasis="medium">{{ transfer.transferNumber }}</BaseTableCell>
        <BaseTableCell>{{ outletName(transfer.sourceOutletId) }}</BaseTableCell>
        <BaseTableCell>{{ outletName(transfer.destinationOutletId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(transfer.transferDate) }}</BaseTableCell>
        <BaseTableCell align="end">{{ transfer.items.length }}</BaseTableCell>
        <BaseTableCell
          ><Badge :color="statusBadgeColor(transfer.status)">{{
            TRANSFER_STATUS_LABELS[transfer.status]
          }}</Badge></BaseTableCell
        >
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="outline"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', transfer)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
