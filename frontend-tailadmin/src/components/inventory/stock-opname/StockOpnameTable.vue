<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  OPNAME_STATUS_LABELS,
  statusBadgeColor,
  type StockOpname,
} from '@/services/stock-opname.service'

defineProps<{
  items: StockOpname[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()

defineEmits<{ (event: 'view', opname: StockOpname): void }>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada stock opname."
    aria-label="Daftar stock opname"
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
      <BaseTableRow v-for="opname in items" :key="opname.id">
        <BaseTableCell emphasis="medium">{{ opname.opnameNumber }}</BaseTableCell>
        <BaseTableCell>{{ outletName(opname.outletId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(opname.opnameDate) }}</BaseTableCell>
        <BaseTableCell align="end">{{ opname.items.length }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(opname.status)">
            {{ OPNAME_STATUS_LABELS[opname.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="outline"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', opname)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
