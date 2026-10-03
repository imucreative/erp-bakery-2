<script setup lang="ts">
/**
 * StockLedgerTable — presentational, read-only table for the Stock Ledger list.
 * Columns: Waktu (createdAt), Produk (name + SKU, resolved from a map), Outlet
 * (name, resolved from a map), Tipe (movement label + direction-coloured
 * badge), Qty (signed by direction), Sebelum → Sesudah, Sumber
 * (sourceDocumentType or "—"). Rows are raw InventoryMovement records that carry
 * IDs only; names are resolved by the parent via lookup maps, with a raw-id
 * fallback. Renders loading / error / empty states. No row actions.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDateTime, formatNumber } from '@/lib/format'
import {
  movementDirection,
  movementTypeLabel,
  type InventoryMovementRow,
} from '@/services/inventory.service'

interface ProductDisplay {
  name: string
  sku: string
}

const props = defineProps<{
  items: InventoryMovementRow[]
  loading: boolean
  errorMessage: string | null
  outletNames: Map<string, string>
  productNames: Map<string, ProductDisplay>
  /** productId → base UOM label, resolved once by the parent (raw-id/no fallback: empty = no unit). */
  productUomLabels: Map<string, string>
}>()

function outletLabel(id: string): string {
  return props.outletNames.get(id) ?? id
}

function productDisplay(id: string): ProductDisplay {
  return props.productNames.get(id) ?? { name: id, sku: '' }
}

/** Base unit of the product for this row; '' when unresolved (qty shown bare). */
function uomLabel(productId: string): string {
  return props.productUomLabels.get(productId) ?? ''
}

type BadgeColor = 'success' | 'error' | 'light'

function badgeColor(type: string): BadgeColor {
  const direction = movementDirection(type)
  if (direction === 'INBOUND') {
    return 'success'
  }
  if (direction === 'OUTBOUND') {
    return 'error'
  }
  return 'light'
}

/**
 * Signed quantity string with the product's base unit appended when known:
 * inbound `+qty`, outbound `−qty`, legacy unsigned. The sign reflects the
 * movement direction; the unit is display-only and omitted when unresolved.
 */
function signedQty(row: InventoryMovementRow): string {
  const value = formatNumber(row.qty)
  const unit = uomLabel(row.productId)
  const suffix = unit ? ` ${unit}` : ''
  const direction = movementDirection(row.movementType)
  if (direction === 'INBOUND') {
    return `+${value}${suffix}`
  }
  if (direction === 'OUTBOUND') {
    return `\u2212${value}${suffix}`
  }
  return `${value}${suffix}`
}

function qtyClass(type: string): string {
  const direction = movementDirection(type)
  if (direction === 'INBOUND') {
    return 'text-success-600 dark:text-success-500'
  }
  if (direction === 'OUTBOUND') {
    return 'text-error-600 dark:text-error-500'
  }
  return 'text-gray-800 dark:text-white/90'
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
      Belum ada riwayat pergerakan stok.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Waktu
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Outlet
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Tipe
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Qty
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Sebelum → Sesudah
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Sumber
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in items"
            :key="row.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatDateTime(row.createdAt) }}
            </td>
            <td class="px-5 py-4">
              <div class="flex flex-col">
                <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {{ productDisplay(row.productId).name }}
                </span>
                <span class="text-theme-xs text-gray-500 dark:text-gray-400">
                  {{ productDisplay(row.productId).sku }}
                </span>
              </div>
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ outletLabel(row.outletId) }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="badgeColor(row.movementType)">
                {{ movementTypeLabel(row.movementType) }}
              </Badge>
            </td>
            <td
              class="px-5 py-4 text-end text-theme-sm font-medium"
              :class="qtyClass(row.movementType)"
            >
              {{ signedQty(row) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatNumber(row.beforeQty) }} → {{ formatNumber(row.afterQty) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ row.sourceDocumentType ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
