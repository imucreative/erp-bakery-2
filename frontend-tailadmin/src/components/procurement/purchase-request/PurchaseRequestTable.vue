<script setup lang="ts">
/**
 * PurchaseRequestTable — presentational table for the PR list. Columns:
 * PR Number, Destination (outlet name), Expected Date, Estimated Total (Rp),
 * Status (colored badge). Row action is icon-only (view/detail). Renders
 * loading / error / empty states. Destination names are resolved by the parent
 * via `outletName` (outlets fetched once for the whole page).
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate, formatRupiah } from '@/lib/format'
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseRequest,
} from '@/services/purchase-request.service'

defineProps<{
  items: PurchaseRequest[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', pr: PurchaseRequest): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada purchase request."
    aria-label="Daftar purchase request"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor PR</BaseTableHead>
        <BaseTableHead>Tujuan</BaseTableHead>
        <BaseTableHead>Tanggal Dibutuhkan</BaseTableHead>
        <BaseTableHead align="end">Estimasi Total</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="pr in items" :key="pr.id">
        <BaseTableCell emphasis="medium">{{ pr.prNumber }}</BaseTableCell>
        <BaseTableCell>{{ outletName(pr.destinationOutletId) }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(pr.expectedDate) }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatRupiah(pr.totalEstimatedAmount) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(pr.status)">
            {{ PURCHASE_REQUEST_STATUS_LABELS[pr.status] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <BaseButton
            size="sm"
            variant="info"
            icon-only
            aria-label="Lihat detail"
            title="Lihat detail"
            @click="$emit('view', pr)"
          >
            <Eye class="h-4 w-4" aria-hidden="true" />
          </BaseButton>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
