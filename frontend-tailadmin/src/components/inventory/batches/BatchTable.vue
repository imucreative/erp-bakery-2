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
  <div>
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Belum ada data batch.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Outlet
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              No. Batch
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Tgl Kedaluwarsa
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kedaluwarsa
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.batch.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4">
              <div class="flex flex-col">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ productDisplay(row.batch.productId).name }}
                </span>
                <span class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ productDisplay(row.batch.productId).sku }}
                </span>
              </div>
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ outletLabel(row.batch.outletId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              <span v-if="row.batch.isNonBatch || !row.batch.batchNumber" class="text-gray-400 dark:text-gray-500">
                Non-batch
              </span>
              <span v-else>{{ row.batch.batchNumber }}</span>
            </td>
            <td class="px-5 py-4 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ formatQtyWithUom(row.batch.qtyAvailable, uomLabel(row.batch.productId)) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.batch.expiredDate ? formatDate(row.batch.expiredDate) : '—' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="statusColor(row.batch.status)">
                {{ batchStatusLabel(row.batch.status) }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <Badge :color="expiryColor(row.expiryState)">
                {{ expiryStateLabel(row.expiryState) }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex justify-end">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white/90"
                  aria-label="Lihat detail batch"
                  title="Lihat detail batch"
                  @click="emit('view', row.batch.id)"
                >
                  <Eye class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
