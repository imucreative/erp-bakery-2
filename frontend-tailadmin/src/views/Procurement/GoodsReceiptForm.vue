<script setup lang="ts">
/**
 * GoodsReceiptForm — full-page create/edit form for a Goods Receipt.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `GoodsReceiptCreate`): empty header. The user picks an APPROVED
 *   source PO. On PO selection the supplier and destination outlet are shown
 *   read-only (inherited on the backend), and the editor's constraint set
 *   (`poItems`) is built from the PO's OUTSTANDING quota — the remaining
 *   ordered quantity after other GRs — via `getOutstanding(poId)`. Only items
 *   with `outstandingQuantity > 0` are included; rows are prefilled from that
 *   outstanding amount (product/PO-item/uom from the item, accepted =
 *   outstanding, rejected = 0, batch/lot/expiry empty).
 * EDIT (route `GoodsReceiptEdit`, :id): loads the GR. Editing is only allowed
 *   for DRAFT; any other status renders read-only with save hidden. The source
 *   PO is locked on edit; we fetch outstanding with `excludeGoodsReceiptId =
 *   this GR`, so the quota this GR already consumes is added back (available
 *   again for this GR). Existing GR rows keep their own accepted/rejected/batch
 *   values, but the per-row cap is the outstanding(exclude-self) amount.
 *
 * PO-locked items (backend-authoritative, mirrored here): a GR's items may ONLY
 * come from the source PO items, and accepted + rejected is capped at the
 * OUTSTANDING (remaining) PO quota. The product per row is read-only, a SUBSET
 * is allowed, and UOM/batch/lot/expiry stay editable. The editor exposes
 * "Tambah dari item PO" to re-add dropped outstanding items (never a product
 * catalog). The payload sends only the included rows.
 *
 * Validation: PO + receiveDate required; each present item needs
 * accepted+rejected ≤ outstanding, at least one of the two > 0, a UOM, and —
 * for batch-tracked products with accepted > 0 — a batch number + expiry date.
 * On success → detail page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import {
  GoodsReceiptHeaderFields,
  GoodsReceiptItemsEditor,
  type EditorItemRow,
  type SourcePoItem,
} from '@/components/procurement/goods-receipt'
import { toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
import { supplierService } from '@/services/supplier.service'
import { purchaseOrderService, type PurchaseOrder } from '@/services/purchase-order.service'
import {
  goodsReceiptService,
  type GoodsReceipt,
  type GoodsReceiptOutstandingItem,
  type SaveGoodsReceiptPayload,
} from '@/services/goods-receipt.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() =>
  isEdit.value ? 'Edit Goods Receipt' : 'Buat Goods Receipt',
)

// ── Supporting data ──────────────────────────────────────────────────
const approvedOrders = ref<PurchaseOrder[]>([])
const products = ref<Product[]>([])
const uoms = ref<Uom[]>([])
const supplierNames = ref<Map<string, string>>(new Map())
const outletNames = ref<Map<string, string>>(new Map())

// ── Form state ───────────────────────────────────────────────────────
const purchaseOrderId = ref<string>('')
const receiveDate = ref<string>(toISODate(new Date()))
const notes = ref<string>('')
const items = ref<EditorItemRow[]>([])
// Source PO outstanding items — the only products allowed, with per-row max qty.
const poItems = ref<SourcePoItem[]>([])
// True once a PO is chosen but every item is fully received (no outstanding).
const allReceived = ref<boolean>(false)
// Supplier + destination outlet are inherited from the chosen PO; shown read-only.
const supplierId = ref<string>('')
const destinationOutletId = ref<string>('')

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<GoodsReceipt['status'] | null>(null)

const isReadOnly = computed<boolean>(
  () => isEdit.value && loadedStatus.value !== null && loadedStatus.value !== 'DRAFT',
)

// Guard so auto-applied prefill never clobbers user intent on edit load.
let suppressPoPrefill = false

const poNumberMap = computed<Map<string, string>>(
  () => new Map(approvedOrders.value.map((po) => [po.id, po.poNumber])),
)

function poNumber(id: string): string {
  return poNumberMap.value.get(id) ?? id
}

// Product label lookup (name + SKU) for clear validation messages.
const productMap = computed<Map<string, Product>>(
  () => new Map(products.value.map((p) => [p.id, p])),
)

function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId
}

function isBatchTracked(productId: string): boolean {
  return productMap.value.get(productId)?.isBatchTracked ?? false
}

// Per-PO-item outstanding cap derived from the source PO outstanding items.
const outstandingByPoItem = computed<Map<string, number>>(
  () => new Map(poItems.value.map((item) => [item.purchaseOrderItemId, item.outstandingQuantity])),
)

const supplierLabel = computed<string>(() => {
  if (!supplierId.value) {
    return ''
  }
  return supplierNames.value.get(supplierId.value) ?? supplierId.value
})

const destinationOutletLabel = computed<string>(() => {
  if (!destinationOutletId.value) {
    return ''
  }
  return outletNames.value.get(destinationOutletId.value) ?? destinationOutletId.value
})

/**
 * Map backend outstanding items (outstanding > 0 only) into the editor's
 * `SourcePoItem` shape, carrying the outstanding amount as the per-row cap.
 */
function toSourcePoItems(outstanding: GoodsReceiptOutstandingItem[]): SourcePoItem[] {
  return outstanding
    .filter((item) => item.outstandingQuantity > 0)
    .map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      productId: item.productId,
      orderedQuantity: item.orderedQuantity,
      outstandingQuantity: item.outstandingQuantity,
      uomId: item.uomId,
    }))
}

/** Prefill one editor row per outstanding item (accepted = outstanding, rest empty). */
function prefillRows(source: SourcePoItem[]): EditorItemRow[] {
  return source.map((item) => ({
    purchaseOrderItemId: item.purchaseOrderItemId,
    productId: item.productId,
    acceptedQuantity: item.outstandingQuantity,
    rejectedQuantity: 0,
    uomId: item.uomId,
    batchNumber: '',
    lotNumber: '',
    expiryDate: '',
  }))
}

async function loadSupportingData(): Promise<void> {
  // Picker list: only APPROVED POs that still have outstanding (≥1 item not yet
  // fully received). Fully-received POs are excluded via `receivable: true` so
  // they never appear as a selectable source when creating a GR.
  const [allOrders, allProducts, allUoms, allSuppliers, allOutlets] = await Promise.all([
    fetchAllPaginated((page) =>
      purchaseOrderService.list({ page, limit: PAGE_LIMIT, status: 'APPROVED', receivable: true }),
    ),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => uomService.list({ page, limit: PAGE_LIMIT, isActive: 'true' })),
    fetchAllPaginated((page) => supplierService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
  ])
  approvedOrders.value = allOrders
  products.value = allProducts
  uoms.value = allUoms
  supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
}

async function loadExisting(id: string): Promise<void> {
  const gr = await goodsReceiptService.getById(id)
  loadedStatus.value = gr.status
  // The picker list (`approvedOrders`) is filtered to `receivable` POs, so a PO
  // that this GR already fully received would be absent — leaving the locked
  // select blank. Ensure the source PO is present so its number renders.
  if (!approvedOrders.value.some((po) => po.id === gr.purchaseOrderId)) {
    try {
      const sourcePo = await purchaseOrderService.getById(gr.purchaseOrderId)
      approvedOrders.value = [sourcePo, ...approvedOrders.value]
    } catch {
      // Non-fatal: the select may show the raw id via the poNumber fallback.
    }
  }
  // Don't let watchers overwrite the loaded values.
  suppressPoPrefill = true
  purchaseOrderId.value = gr.purchaseOrderId
  receiveDate.value = gr.receiveDate ? gr.receiveDate.slice(0, 10) : toISODate(new Date())
  notes.value = gr.notes ?? ''
  supplierId.value = gr.supplierId
  destinationOutletId.value = gr.destinationOutletId
  // Keep the existing GR rows (their own accepted/rejected/batch); only the
  // per-row cap comes from the outstanding endpoint below.
  items.value = gr.items.map((item) => ({
    purchaseOrderItemId: item.purchaseOrderItemId,
    productId: item.productId,
    acceptedQuantity: item.acceptedQuantity,
    rejectedQuantity: item.rejectedQuantity,
    uomId: item.uomId,
    batchNumber: item.batchNumber ?? '',
    lotNumber: item.lotNumber ?? '',
    expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : '',
  }))
  // Constrain the editor to the PO's OUTSTANDING quota, EXCLUDING this GR so its
  // own receipt is added back (available again for this GR). If the endpoint
  // fails, fall back to the GR items themselves so the product stays read-only
  // and existing quantities remain the cap.
  try {
    const outstanding = await goodsReceiptService.getOutstanding(gr.purchaseOrderId, gr.id)
    poItems.value = toSourcePoItems(outstanding)
  } catch {
    poItems.value = gr.items.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      productId: item.productId,
      orderedQuantity: item.orderedQuantity,
      outstandingQuantity: item.acceptedQuantity + item.rejectedQuantity,
      uomId: item.uomId,
    }))
  }
}

onMounted(async () => {
  loading.value = true
  loadError.value = null
  try {
    await loadSupportingData()
    if (editId.value) {
      await loadExisting(editId.value)
    }
  } catch (error) {
    loadError.value = toMessage(error)
  } finally {
    loading.value = false
  }
})

// ── Reactive prefill behavior (create mode) ──────────────────────────
// When the source PO changes, inherit its supplier + destination outlet
// (read-only) and prefill the item rows from the PO outstanding. Skipped on
// edit load.
watch(purchaseOrderId, async (poId) => {
  if (suppressPoPrefill) {
    suppressPoPrefill = false
    return
  }
  if (!poId) {
    supplierId.value = ''
    destinationOutletId.value = ''
    poItems.value = []
    items.value = []
    allReceived.value = false
    return
  }
  // Supplier + destination outlet are inherited from the PO header (read-only).
  const po = approvedOrders.value.find((o) => o.id === poId)
  if (po) {
    supplierId.value = po.supplierId
    destinationOutletId.value = po.destinationOutletId
  }
  try {
    const outstanding = await goodsReceiptService.getOutstanding(poId)
    const source = toSourcePoItems(outstanding)
    poItems.value = source
    allReceived.value = source.length === 0
    items.value = prefillRows(source)
  } catch (error) {
    formError.value = toMessage(error)
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!purchaseOrderId.value) {
    return 'PO sumber wajib dipilih.'
  }
  if (!receiveDate.value) {
    return 'Tanggal terima wajib diisi.'
  }
  if (allReceived.value) {
    return 'Semua item PO ini sudah habis diterima pada GR lain. Tidak ada sisa untuk diterima.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu item harus disertakan dari item PO sumber.'
  }
  const seen = new Set<string>()
  for (const item of items.value) {
    const label = productLabel(item.productId)
    // Product must come from an outstanding source PO item (editor enforces this).
    if (!outstandingByPoItem.value.has(item.purchaseOrderItemId)) {
      return `Item ${label}: produk tidak termasuk dalam sisa item PO sumber.`
    }
    // No duplicate PO items (one row per PO item).
    if (seen.has(item.purchaseOrderItemId)) {
      return `Item ${label}: produk tidak boleh muncul lebih dari satu kali.`
    }
    seen.add(item.purchaseOrderItemId)
    if (!item.uomId) {
      return `Item ${label}: UOM wajib dipilih.`
    }
    const accepted = Number(item.acceptedQuantity) || 0
    const rejected = Number(item.rejectedQuantity) || 0
    if (accepted < 0 || rejected < 0) {
      return `Item ${label}: kuantitas tidak boleh negatif.`
    }
    if (accepted + rejected <= 0) {
      return `Item ${label}: isi jumlah diterima atau ditolak (minimal salah satu > 0).`
    }
    const maxQty = outstandingByPoItem.value.get(item.purchaseOrderItemId) ?? 0
    if (maxQty > 0 && accepted + rejected > maxQty) {
      return `Item ${label}: diterima + ditolak melebihi sisa PO (maks ${maxQty}).`
    }
    // Batch-tracked products with accepted > 0 require batch + expiry.
    if (isBatchTracked(item.productId) && accepted > 0) {
      if (!item.batchNumber.trim()) {
        return `Item ${label}: nomor batch wajib untuk produk batch-tracked.`
      }
      if (!item.expiryDate) {
        return `Item ${label}: tanggal kadaluarsa wajib untuk produk batch-tracked.`
      }
    }
  }
  return null
}

async function onSubmit(): Promise<void> {
  if (isReadOnly.value) {
    return
  }
  const validationError = validate()
  if (validationError) {
    formError.value = validationError
    return
  }
  formError.value = null
  submitting.value = true
  try {
    // Items are locked to the source PO; send only the included rows (subset
    // allowed). Validation already guarantees at least one row.
    const mappedItems = items.value.map((item) => ({
      purchaseOrderItemId: item.purchaseOrderItemId,
      productId: item.productId,
      acceptedQuantity: Number(item.acceptedQuantity) || 0,
      rejectedQuantity: Number(item.rejectedQuantity) || 0,
      uomId: item.uomId,
      batchNumber: item.batchNumber.trim() || undefined,
      lotNumber: item.lotNumber.trim() || undefined,
      expiryDate: item.expiryDate || undefined,
    }))
    const payload: SaveGoodsReceiptPayload = {
      purchaseOrderId: purchaseOrderId.value,
      receiveDate: receiveDate.value,
      notes: notes.value.trim() || undefined,
      items: mappedItems,
    }
    const saved = editId.value
      ? await goodsReceiptService.update(editId.value, payload)
      : await goodsReceiptService.create(payload)
    void router.push({ name: 'GoodsReceiptDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'GoodsReceipts' })
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <!-- Page header: back (icon-only) + title on the start -->
    <div class="mb-5 flex flex-wrap items-center gap-3">
      <BaseButton
        variant="outline"
        icon-only
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="h-10 w-10"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </BaseButton>
      <h3 class="card-title">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="text-muted py-10 text-center">Memuat data...</div>

      <div v-else-if="loadError" class="alert-error px-4 py-3" role="alert">
        {{ loadError }}
      </div>

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <p
          v-if="isReadOnly"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          GR ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <GoodsReceiptHeaderFields
          v-model:purchase-order-id="purchaseOrderId"
          v-model:receive-date="receiveDate"
          v-model:notes="notes"
          :approved-orders="approvedOrders"
          :po-number="poNumber"
          :supplier-label="supplierLabel"
          :destination-outlet-label="destinationOutletLabel"
          :disabled="isReadOnly"
          :po-locked="isEdit"
        />

        <!-- Line items -->
        <div>
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Item</h5>
          <p
            v-if="allReceived"
            class="mb-3 rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
            role="alert"
          >
            Semua item PO ini sudah habis diterima pada GR lain. Tidak ada sisa (outstanding) yang
            bisa diterima, sehingga GR tidak dapat dibuat.
          </p>
          <GoodsReceiptItemsEditor
            v-model="items"
            :po-items="poItems"
            :products="products"
            :uoms="uoms"
            :disabled="isReadOnly"
          />
        </div>

        <p v-if="formError" class="alert-error px-3 py-2">
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </BaseButton>
          <BaseButton
            v-if="!isReadOnly"
            type="submit"
            variant="primary"
            :disabled="submitting || allReceived"
            :loading="submitting"
            loading-text="Menyimpan..."
          >
            Simpan sebagai Draft
          </BaseButton>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
