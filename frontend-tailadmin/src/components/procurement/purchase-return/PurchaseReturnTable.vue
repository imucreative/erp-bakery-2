<script setup lang="ts">
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate } from '@/lib/format'
import {
  PURCHASE_RETURN_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseReturn,
} from '@/services/purchase-return.service'

defineProps<{
  items: PurchaseReturn[]
  loading: boolean
  errorMessage: string | null
  grNumber: (id: string) => string
}>()

defineEmits<{
  (event: 'view', pr: PurchaseReturn): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada purchase return."
    aria-label="Daftar purchase return"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nomor Retur</BaseTableHead>
        <BaseTableHead>GR Sumber</BaseTableHead>
        <BaseTableHead>Vendor</BaseTableHead>
        <BaseTableHead>Tanggal Retur</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="pr in items" :key="pr.id">
        <BaseTableCell emphasis="medium">{{ pr.returnNumber }}</BaseTableCell>
        <BaseTableCell>{{ grNumber(pr.goodsReceiptId) }}</BaseTableCell>
        <BaseTableCell>{{ pr.supplierName }}</BaseTableCell>
        <BaseTableCell>{{ formatDate(pr.returnDate) }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusBadgeColor(pr.status)">
            {{ PURCHASE_RETURN_STATUS_LABELS[pr.status] }}
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
