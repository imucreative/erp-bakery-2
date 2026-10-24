<script setup lang="ts">
/**
 * ShiftTable — presentational table for the Shift list. Columns: Outlet, Kasir,
 * Dibuka, Kas Awal, Kas Diharapkan, Kas Aktual, Selisih, Status (badge).
 * Outlet and cashier display names are included on each shift row.
 * Renders loading / error / empty states.
 */
import Badge from '@/components/ui/Badge.vue'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatRupiah, formatDateTime } from '@/lib/format'
import { SHIFT_STATUS_LABELS, shiftStatusBadgeColor, type Shift } from '@/services/sales.service'

const props = defineProps<{
  items: Shift[]
  loading: boolean
  errorMessage: string | null
}>()
</script>

<template>
  <BaseTable
    :loading="props.loading"
    :error-message="props.errorMessage"
    :is-empty="props.items.length === 0"
    empty-message="Belum ada shift kasir."
    aria-label="Daftar shift kasir"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead>Kasir</BaseTableHead>
        <BaseTableHead>Dibuka</BaseTableHead>
        <BaseTableHead align="end">Kas Awal</BaseTableHead>
        <BaseTableHead align="end">Kas Diharapkan</BaseTableHead>
        <BaseTableHead align="end">Kas Aktual</BaseTableHead>
        <BaseTableHead align="end">Selisih</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="shift in props.items" :key="shift.id">
        <BaseTableCell emphasis="medium">
          {{ shift.outletName || shift.outletId }}
        </BaseTableCell>
        <BaseTableCell>{{ shift.cashierName || shift.cashierUserId }}</BaseTableCell>
        <BaseTableCell>{{ formatDateTime(shift.openedAt) }}</BaseTableCell>
        <BaseTableCell align="end">{{ formatRupiah(shift.openingCash) }}</BaseTableCell>
        <BaseTableCell align="end">
          {{ shift.expectedCash !== null ? formatRupiah(shift.expectedCash) : '—' }}
        </BaseTableCell>
        <BaseTableCell align="end">
          {{ shift.actualCash !== null ? formatRupiah(shift.actualCash) : '—' }}
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ shift.discrepancy !== null ? formatRupiah(shift.discrepancy) : '—' }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="shiftStatusBadgeColor(shift.status)">
            {{ SHIFT_STATUS_LABELS[shift.status] }}
          </Badge>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
