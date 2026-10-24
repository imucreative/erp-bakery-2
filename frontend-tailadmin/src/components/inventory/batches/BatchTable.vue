<script setup lang="ts">
/**
 * BatchTable — presentational, read-only table for the Batch & Expiry list.
 * Columns: Produk (name + SKU, resolved from a map), Outlet (name, resolved
 * from a map), No. Batch (batchNumber; "Non-batch" for synthetic rows), Qty
 * (qtyAvailable), Tgl Kedaluwarsa (expiredDate; "—" when null), Status (batch
 * status badge), Kedaluwarsa (expiryState badge: EXPIRED→error,
 * EXPIRING_SOON→warning, OK→success, NOT_APPLICABLE→light), and an icon-only
 * "Lihat" action that emits `view`. Rows are raw InventoryBatch records that
 * carry IDs only; names are resolved by the parent via lookup maps, with a
 * raw-id fallback. Expiry classification is backend-derived (never recomputed
 * here). Renders loading / error / empty states.
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatDate, formatQtyWithUom } from '@/lib/format'
import {
  batchStatusLabel,
  expiryStateLabel,
  type BatchWithExpiry,
  type ExpiryState,
} from '@/services/inventory.service'

interface ProductDisplay {
  name: string
  sku: string
}

const props = defineProps<{
  items: BatchWithExpiry[]
  loading: boolean
  errorMessage: string | null
  outletNames: Map<string, string>
  productNames: Map<string, ProductDisplay>
  /** productId → base UOM label, resolved once by the parent ('' = no unit). */
  productUomLabels: Map<string, string>
}>()

const emit = defineEmits<{
  (event: 'view', id: string): void
}>()

function outletLabel(id: string): string {
  return props.outletNames.get(id) ?? id
}

function productDisplay(id: string): ProductDisplay {
  return props.productNames.get(id) ?? { name: id, sku: '' }
}

/** Base unit of the product for this batch; '' when unresolved. */
function uomLabel(productId: string): string {
  return props.productUomLabels.get(productId) ?? ''
}

type BatchStatusColor = 'success' | 'error' | 'light' | 'warning'

function statusColor(status: string): BatchStatusColor {
  if (status === 'ACTIVE') {
    return 'success'
  }
  if (status === 'EXPIRED') {
    return 'error'
  }
  if (status === 'QUARANTINE') {
    return 'warning'
  }
  return 'light'
}

type ExpiryColor = 'success' | 'error' | 'warning' | 'light'

function expiryColor(state: ExpiryState): ExpiryColor {
  if (state === 'EXPIRED') {
    return 'error'
  }
  if (state === 'EXPIRING_SOON') {
    return 'warning'
  }
  if (state === 'OK') {
    return 'success'
  }
  return 'light'
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada data batch."
    aria-label="Daftar batch dan expiry"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead>No. Batch</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead>Tgl Kedaluwarsa</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead>Kedaluwarsa</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="row in items" :key="row.batch.id">
        <BaseTableCell>
          <div class="flex flex-col">
            <span class="text-strong">
              {{ productDisplay(row.batch.productId).name }}
            </span>
            <span class="text-meta">
              {{ productDisplay(row.batch.productId).sku }}
            </span>
          </div>
        </BaseTableCell>
        <BaseTableCell>
          {{ outletLabel(row.batch.outletId) }}
        </BaseTableCell>
        <BaseTableCell>
          <span
            v-if="row.batch.isNonBatch || !row.batch.batchNumber"
            class="text-gray-400 dark:text-gray-500"
          >
            Non-batch
          </span>
          <span v-else>{{ row.batch.batchNumber }}</span>
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ formatQtyWithUom(row.batch.qtyAvailable, uomLabel(row.batch.productId)) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ row.batch.expiredDate ? formatDate(row.batch.expiredDate) : '—' }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="statusColor(row.batch.status)">
            {{ batchStatusLabel(row.batch.status) }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="expiryColor(row.expiryState)">
            {{ expiryStateLabel(row.expiryState) }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="button-row">
            <BaseButton
              size="sm"
              variant="outline"
              icon-only
              aria-label="Lihat detail batch"
              title="Lihat detail batch"
              @click="emit('view', row.batch.id)"
            >
              <Eye class="h-4 w-4" />
            </BaseButton>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
