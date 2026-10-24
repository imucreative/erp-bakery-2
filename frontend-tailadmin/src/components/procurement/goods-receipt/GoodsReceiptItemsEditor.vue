<script setup lang="ts">
/**
 * GoodsReceiptItemsEditor — PO-locked line-items grid for the GR form.
 *
 * Business rule (backend-authoritative, mirrored here for UX): a GR's items may
 * ONLY come from the items of its source Purchase Order, constrained to the
 * OUTSTANDING (remaining) quantity across GRs. Specifically:
 *   1. Product is NOT free-choice — each row's product/PO-item is dictated by a
 *      source PO outstanding item. No foreign products, no duplicate PO items.
 *   2. A SUBSET of the PO items is allowed (the user may drop some rows).
 *   3. `acceptedQuantity + rejectedQuantity ≤ outstandingQuantity` per row, and
 *      at least one of the two must be > 0 for an included item.
 *   4. For a batch-tracked product with `acceptedQuantity > 0`, `batchNumber`
 *      and `expiryDate` are required. Non-batch products: batch/expiry optional.
 *   5. UOM is READ-ONLY — it follows the PO item (GR unit = PO unit, per UOM
 *      Conversion design decision #4). The row inherits `uomId` from the PO item
 *      and the column renders the UOM name as a label, not a select.
 *
 * Because of (1), the Product column is READ-ONLY (a label, not a catalog
 * select) and there is no free "Add Item" button. Rows start prefilled from the
 * PO outstanding set by the parent. Users exclude a row with the per-row remove
 * button, and can re-add a previously removed PO item through the "Tambah dari
 * item PO" dropdown — which only lists outstanding PO items not already present
 * (so duplicates are impossible and it is empty once every outstanding item is
 * in the table).
 */
import { computed } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import {
  BaseButton,
  BaseInput,
  BaseSelect,
  BaseTable,
  BaseTableCell,
  BaseTableHead,
  BaseTableRow,
} from '@/components/ui'
import type { Product } from '@/services/product.service'
import type { Uom } from '@/services/uom.service'

/** A single editable row (local editor shape; parent maps to the API payload). */
export interface EditorItemRow {
  purchaseOrderItemId: string
  productId: string
  acceptedQuantity: number
  rejectedQuantity: number
  uomId: string
  batchNumber: string
  lotNumber: string
  expiryDate: string
}

/**
 * A source PO outstanding item used to constrain the editor. Supplies the
 * allowed PO item/product, the ordered quantity (display), the maximum
 * (outstanding) quantity, and the UOM default applied when a dropped item is
 * re-added. `outstandingQuantity` is the authoritative per-row cap for
 * accepted + rejected.
 */
export interface SourcePoItem {
  purchaseOrderItemId: string
  productId: string
  orderedQuantity: number
  outstandingQuantity: number
  uomId: string
}

const props = defineProps<{
  modelValue: EditorItemRow[]
  /** Outstanding items of the source PO — the only products allowed in this GR. */
  poItems: SourcePoItem[]
  products: Product[]
  uoms: Uom[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  (event: 'update:modelValue', rows: EditorItemRow[]): void
}>()

const productMap = computed<Map<string, Product>>(
  () => new Map(props.products.map((p) => [p.id, p])),
)
const uomMap = computed<Map<string, Uom>>(() => new Map(props.uoms.map((u) => [u.id, u])))

/** Fast lookup of the source PO outstanding item per PO-item id. */
const poItemMap = computed<Map<string, SourcePoItem>>(
  () => new Map(props.poItems.map((item) => [item.purchaseOrderItemId, item])),
)

/** Human label for a row's product (name + SKU) with graceful fallbacks. */
function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  if (!product) {
    return productId || '—'
  }
  return `${product.name} (${product.sku})`
}

/** Human label for a row's UOM (resolved by `uomId`) with a graceful fallback. */
function uomLabel(uomId: string): string {
  return uomMap.value.get(uomId)?.name || '—'
}

/** True when the row's product is batch-tracked (batch + expiry become required). */
function isBatchTracked(productId: string): boolean {
  return productMap.value.get(productId)?.isBatchTracked ?? false
}

/** The matching PO item's ordered quantity (display only). */
function orderedForRow(row: EditorItemRow): number {
  return poItemMap.value.get(row.purchaseOrderItemId)?.orderedQuantity ?? 0
}

/** The matching PO item's outstanding (remaining) quota — the per-row max for accepted+rejected. */
function maxQtyForRow(row: EditorItemRow): number {
  return poItemMap.value.get(row.purchaseOrderItemId)?.outstandingQuantity ?? 0
}

/** accepted + rejected for a row (NaN-safe). */
function receivedForRow(row: EditorItemRow): number {
  return (Number(row.acceptedQuantity) || 0) + (Number(row.rejectedQuantity) || 0)
}

/** True when accepted + rejected exceeds the outstanding quota. */
function overMax(row: EditorItemRow): boolean {
  const max = maxQtyForRow(row)
  return max > 0 && receivedForRow(row) > max
}

/**
 * PO outstanding items not yet present in the editor — the only choices for the
 * "add" dropdown. Prevents duplicate PO items and is empty once all are in.
 */
const addableItems = computed<SourcePoItem[]>(() => {
  const used = new Set(props.modelValue.map((row) => row.purchaseOrderItemId))
  return props.poItems.filter((item) => !used.has(item.purchaseOrderItemId))
})

function emitRows(rows: EditorItemRow[]): void {
  emit('update:modelValue', rows)
}

function updateRow(index: number, patch: Partial<EditorItemRow>): void {
  const next = props.modelValue.map((row, i) => (i === index ? { ...row, ...patch } : row))
  emitRows(next)
}

/** Add a dropped PO item back as a row, prefilled with its PO defaults. */
function onAddFromPo(purchaseOrderItemId: string): void {
  if (!purchaseOrderItemId) {
    return
  }
  const poItem = poItemMap.value.get(purchaseOrderItemId)
  if (!poItem) {
    return
  }
  emitRows([
    ...props.modelValue,
    {
      purchaseOrderItemId: poItem.purchaseOrderItemId,
      productId: poItem.productId,
      acceptedQuantity: poItem.outstandingQuantity,
      rejectedQuantity: 0,
      uomId: poItem.uomId,
      batchNumber: '',
      lotNumber: '',
      expiryDate: '',
    },
  ])
}

function removeRow(index: number): void {
  emitRows(props.modelValue.filter((_, i) => i !== index))
}
</script>

<template>
  <div class="space-y-3">
    <BaseTable aria-label="Editor item goods receipt">
      <template #header>
        <BaseTableRow variant="header">
          <BaseTableHead>Produk</BaseTableHead>
          <BaseTableHead align="end">Dipesan</BaseTableHead>
          <BaseTableHead>Diterima</BaseTableHead>
          <BaseTableHead>Ditolak</BaseTableHead>
          <BaseTableHead>UOM</BaseTableHead>
          <BaseTableHead>Batch</BaseTableHead>
          <BaseTableHead>Kadaluarsa</BaseTableHead>
          <BaseTableHead>Lot</BaseTableHead>
          <BaseTableHead align="end">Aksi</BaseTableHead>
        </BaseTableRow>
      </template>
      <template #body>
        <BaseTableRow
          v-for="(row, index) in modelValue"
          :key="row.purchaseOrderItemId || index"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <!-- Product (read-only — dictated by the source PO item) -->
          <BaseTableCell class="align-top">
            <div class="flex min-h-11 flex-col justify-center">
              <span class="text-strong">
                {{ productLabel(row.productId) }}
              </span>
              <span
                v-if="isBatchTracked(row.productId)"
                class="text-theme-xs text-brand-500 dark:text-brand-400"
              >
                Batch-tracked
              </span>
              <span v-else class="text-muted-xs"> Dari item PO </span>
            </div>
          </BaseTableCell>
          <!-- Ordered (read-only) -->
          <BaseTableCell align="end" class="align-middle">
            {{ orderedForRow(row) }}
          </BaseTableCell>
          <!-- Accepted -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`goods-receipt-accepted-${index}`"
              :model-value="row.acceptedQuantity"
              type="number"
              min="0"
              :max="maxQtyForRow(row) || undefined"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { acceptedQuantity: Number($event) })"
            />
          </BaseTableCell>
          <!-- Rejected -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`goods-receipt-rejected-${index}`"
              :model-value="row.rejectedQuantity"
              type="number"
              min="0"
              :max="maxQtyForRow(row) || undefined"
              step="any"
              :disabled="disabled"
              @update:model-value="updateRow(index, { rejectedQuantity: Number($event) })"
            />
            <span v-if="overMax(row)" class="mt-1 block text-theme-xs text-error-500">
              Terima + tolak maks {{ maxQtyForRow(row) }} (sisa PO)
            </span>
            <span v-else-if="maxQtyForRow(row) > 0" class="mt-1 block text-muted-xs">
              Maks {{ maxQtyForRow(row) }} (sisa PO)
            </span>
          </BaseTableCell>
          <!-- UOM (read-only — follows the source PO item) -->
          <BaseTableCell class="align-top">
            <div class="flex min-h-11 flex-col justify-center">
              <span class="text-value">
                {{ uomLabel(row.uomId) }}
              </span>
              <span class="text-muted-xs"> Dari item PO </span>
            </div>
          </BaseTableCell>
          <!-- Batch Number -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`goods-receipt-batch-${index}`"
              :model-value="row.batchNumber"
              type="text"
              :disabled="disabled"
              :placeholder="isBatchTracked(row.productId) ? 'Wajib' : 'Opsional'"
              @update:model-value="updateRow(index, { batchNumber: $event })"
            />
            <span
              v-if="
                isBatchTracked(row.productId) &&
                Number(row.acceptedQuantity) > 0 &&
                !row.batchNumber.trim()
              "
              class="mt-1 block text-theme-xs text-error-500"
            >
              Batch wajib
            </span>
          </BaseTableCell>
          <!-- Expiry Date -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`goods-receipt-expiry-${index}`"
              :model-value="row.expiryDate"
              type="date"
              :disabled="disabled"
              @update:model-value="updateRow(index, { expiryDate: $event })"
            />
            <span
              v-if="
                isBatchTracked(row.productId) && Number(row.acceptedQuantity) > 0 && !row.expiryDate
              "
              class="mt-1 block text-theme-xs text-error-500"
            >
              Kadaluarsa wajib
            </span>
          </BaseTableCell>
          <!-- Lot Number -->
          <BaseTableCell class="align-top">
            <BaseInput
              :id="`goods-receipt-lot-${index}`"
              :model-value="row.lotNumber"
              type="text"
              :disabled="disabled"
              placeholder="Opsional"
              @update:model-value="updateRow(index, { lotNumber: $event })"
            />
          </BaseTableCell>
          <!-- Remove -->
          <BaseTableCell align="end" class="align-top">
            <BaseButton
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus baris"
              title="Hapus baris"
              :disabled="disabled"
              @click="removeRow(index)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </BaseTableCell>
        </BaseTableRow>

        <BaseTableRow v-if="modelValue.length === 0">
          <BaseTableCell colspan="9" align="center">
            <template v-if="poItems.length === 0">
              Pilih PO sumber untuk memuat item yang masih tersisa (outstanding).
            </template>
            <template v-else> Belum ada item. Tambahkan dari item PO di bawah. </template>
          </BaseTableCell>
        </BaseTableRow>
      </template>
    </BaseTable>

    <!-- Add from PO items — only items not already in the table; never a product catalog -->
    <div v-if="!disabled && addableItems.length > 0" class="flex items-center gap-2">
      <div class="relative w-full max-w-xs">
        <BaseSelect
          id="goods-receipt-add-item"
          model-value=""
          :options="
            addableItems.map((item) => ({
              value: item.purchaseOrderItemId,
              label: productLabel(item.productId),
            }))
          "
          placeholder="Tambah dari item PO..."
          aria-label="Tambah dari item PO"
          @update:model-value="onAddFromPo($event)"
        >
        </BaseSelect>
      </div>
      <Plus class="h-4 w-4 text-gray-400 dark:text-gray-500" aria-hidden="true" />
    </div>

    <p class="text-muted-xs">
      Item hanya dapat dipilih dari item PO sumber. Jumlah diterima + ditolak tidak boleh melebihi
      sisa (outstanding) PO. Untuk produk batch-tracked dengan jumlah diterima &gt; 0, nomor batch
      dan tanggal kadaluarsa wajib diisi.
    </p>
  </div>
</template>
