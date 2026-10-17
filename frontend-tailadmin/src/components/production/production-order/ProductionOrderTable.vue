<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate, formatNumber } from '@/lib/format'
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  statusBadgeColor,
  type ProductionOrder,
} from '@/services/production-order.service'

defineProps<{
  items: ProductionOrder[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()
defineEmits<{ (event: 'view', order: ProductionOrder): void }>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada perintah produksi."
    aria-label="Daftar production order"
  >
    <template #header
      ><BaseTableRow variant="header"
        ><BaseTableHead>Nomor</BaseTableHead><BaseTableHead>Produk</BaseTableHead
        ><BaseTableHead>Outlet</BaseTableHead><BaseTableHead>Tanggal</BaseTableHead
        ><BaseTableHead align="end">Target</BaseTableHead
        ><BaseTableHead align="end">Berhasil</BaseTableHead
        ><BaseTableHead align="end">Terbuang</BaseTableHead><BaseTableHead>Status</BaseTableHead
        ><BaseTableHead align="end">Aksi</BaseTableHead></BaseTableRow
      ></template
    >
    <template #body>
      <BaseTableRow v-for="order in items" :key="order.id">
        <BaseTableCell emphasis="medium">{{ order.productionNumber }}</BaseTableCell>
        <BaseTableCell>{{ order.productName || order.productId }}</BaseTableCell>
        <BaseTableCell>{{ order.outletName || outletName(order.outletId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(order.productionDate) }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatNumber(order.scheduledQty) }}</BaseTableCell>
        <BaseTableCell align="end">{{
          order.actualQty !== null ? formatNumber(order.actualQty) : '-'
        }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatNumber(order.wasteQty) }}</BaseTableCell>
        <BaseTableCell
          ><Badge :color="statusBadgeColor(order.status)">{{
            PRODUCTION_ORDER_STATUS_LABELS[order.status]
          }}</Badge></BaseTableCell
        >
        <BaseTableCell align="end"
          ><BaseButton
            size="sm"
            variant="outline"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', order)"
            ><Eye class="h-4 w-4" aria-hidden="true" /></BaseButton
        ></BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
