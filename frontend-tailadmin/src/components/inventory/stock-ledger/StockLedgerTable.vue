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
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
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
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada riwayat pergerakan stok."
    aria-label="Daftar stock ledger"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Waktu</BaseTableHead>
        <BaseTableHead>Produk</BaseTableHead>
        <BaseTableHead>Outlet</BaseTableHead>
        <BaseTableHead>Tipe</BaseTableHead>
        <BaseTableHead align="end">Qty</BaseTableHead>
        <BaseTableHead align="end">Sebelum → Sesudah</BaseTableHead>
        <BaseTableHead>Sumber</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="row in items" :key="row.id">
        <BaseTableCell>
          {{ formatDateTime(row.createdAt) }}
        </BaseTableCell>
        <BaseTableCell>
          <div class="flex flex-col">
            <span class="text-strong">
              {{ productDisplay(row.productId).name }}
            </span>
            <span class="text-meta">
              {{ productDisplay(row.productId).sku }}
            </span>
          </div>
        </BaseTableCell>
        <BaseTableCell>
          {{ outletLabel(row.outletId) }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="badgeColor(row.movementType)">
            {{ movementTypeLabel(row.movementType) }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium" :class="qtyClass(row.movementType)">
          {{ signedQty(row) }}
        </BaseTableCell>
        <BaseTableCell align="end">
          {{ formatNumber(row.beforeQty) }} → {{ formatNumber(row.afterQty) }}
        </BaseTableCell>
        <BaseTableCell>
          {{ row.sourceDocumentType ?? '—' }}
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
