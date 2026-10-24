<script setup lang="ts">
/**
 * PurchaseOrderForm — full-page create/edit form for a Purchase Order.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `PurchaseOrderCreate`): empty header. The user picks an
 *   APPROVED source PR and a supplier. On PR selection the destination outlet
 *   is shown read-only (inherited on the backend), and the editor's constraint
 *   set (`prItems`) is built from the PR's OUTSTANDING quota — the remaining PR
 *   quantity after other active POs — via `getOutstanding(prId)`. Only items
 *   with `outstandingQuantity > 0` are included; rows are prefilled from that
 *   outstanding amount (product/uom from the item, quantity = outstanding,
 *   unitPrice defaulted from estimatedPrice, taxPercent 0). On supplier
 *   selection the supplier's default payment term is applied when not overridden.
 * EDIT (route `PurchaseOrderEdit`, :id): loads the PO. Editing is only allowed
 *   for DRAFT/REJECTED; any other status renders read-only with save hidden.
 *   The source PR is locked on edit; we fetch outstanding with
 *   `excludePurchaseOrderId = this PO`, so the quota the PO already consumes is
 *   added back (available again for this PO). Existing PO rows keep their own
 *   qty/uom/price, but the per-row cap is the outstanding(exclude-self) amount.
 *
 * PR-locked items (backend-authoritative, mirrored here): a PO's items may ONLY
 * come from the source PR items, and quantity is capped at the OUTSTANDING
 * (remaining) PR quota — qtyPR minus the quantity consumed by other active POs.
 * The product per row is read-only, a SUBSET is allowed, and UOM/price/tax stay
 * editable. The editor exposes "Tambah dari item PR" to re-add dropped
 * outstanding items (never a product catalog). The payload sends only the
 * included rows. If every PR item is fully consumed (no outstanding), creation
 * is blocked with a clear message.
 *
 * Decision — payment-term preview: the estimated due date (orderDate + dueDays)
 * is shown read-only as a hint only; the backend is authoritative.
 *
 * Validation: PR + supplier + orderDate required; each present item needs
 * product+UOM+quantity>0+unitPrice>=0+taxPercent>=0. The payload omits
 * subtotal/tax/total (server computes). On success → detail page.
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseAlert, BaseButton } from '@/components/ui'
import {
  PurchaseOrderHeaderFields,
  PurchaseOrderItemsEditor,
  type EditorItemRow,
  type SourcePrItem,
} from '@/components/procurement/purchase-order'
import { formatDate, toISODate } from '@/lib/format'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
import { supplierService, type Supplier } from '@/services/supplier.service'
import { paymentTermService, type PaymentTerm } from '@/services/payment-term.service'
import { purchaseRequestService, type PurchaseRequest } from '@/services/purchase-request.service'
import {
  purchaseOrderService,
  type PurchaseOrder,
  type PurchaseOrderOutstandingItem,
  type SavePurchaseOrderPayload,
} from '@/services/purchase-order.service'

const route = useRoute()
const router = useRouter()

const editId = computed<string | null>(() => {
  const id = route.params.id
  return typeof id === 'string' && id.length > 0 ? id : null
})
const isEdit = computed<boolean>(() => editId.value !== null)
const pageTitle = computed<string>(() =>
  isEdit.value ? 'Edit Purchase Order' : 'Buat Purchase Order',
)

// ── Supporting data ──────────────────────────────────────────────────
const approvedRequests = ref<PurchaseRequest[]>([])
const suppliers = ref<Supplier[]>([])
const paymentTerms = ref<PaymentTerm[]>([])
const products = ref<Product[]>([])
const uoms = ref<Uom[]>([])
const outletNames = ref<Map<string, string>>(new Map())

// ── Form state ───────────────────────────────────────────────────────
const purchaseRequestId = ref<string>('')
const supplierId = ref<string>('')
const orderDate = ref<string>(toISODate(new Date()))
const paymentTermId = ref<string>('')
const notes = ref<string>('')
const items = ref<EditorItemRow[]>([])
// Source PR items — the only products allowed in this PO, with per-row max qty.
// `quantity` here is the OUTSTANDING (remaining) quota, not the raw PR quantity.
// Built from `getOutstanding(prId[, excludeSelf])`, filtered to outstanding > 0.
const prItems = ref<SourcePrItem[]>([])
// True once a PR is chosen but every item is fully consumed by other active POs
// (outstanding list is empty). Blocks submit so we never create an empty PO.
const allConsumed = ref<boolean>(false)
// Destination outlet is inherited from the chosen PR; shown read-only.
const destinationOutletId = ref<string>('')

// ── Load / lifecycle ─────────────────────────────────────────────────
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const loadedStatus = ref<PurchaseOrder['status'] | null>(null)

const isReadOnly = computed<boolean>(
  () =>
    isEdit.value &&
    loadedStatus.value !== null &&
    loadedStatus.value !== 'DRAFT' &&
    loadedStatus.value !== 'REJECTED',
)

// Guards so auto-applied prefill/payment-term never clobbers user intent.
let suppressPrPrefill = false
let suppressSupplierDefault = false

const prNumberMap = computed<Map<string, string>>(
  () => new Map(approvedRequests.value.map((pr) => [pr.id, pr.prNumber])),
)

// Product label lookup (name + SKU) for clear validation messages.
const productMap = computed<Map<string, Product>>(
  () => new Map(products.value.map((p) => [p.id, p])),
)

function productLabel(productId: string): string {
  const product = productMap.value.get(productId)
  return product ? `${product.name} (${product.sku})` : productId
}

// Per-product max quantity derived from the source PR items. This is the
// OUTSTANDING (remaining) quota — `prItems` carries outstanding in `quantity`.
const prQtyByProduct = computed<Map<string, number>>(
  () => new Map(prItems.value.map((item) => [item.productId, item.quantity])),
)

/**
 * Map backend outstanding items (outstanding > 0 only) into the editor's
 * `SourcePrItem` shape, carrying the outstanding amount as the per-row cap.
 */
function toSourcePrItems(outstanding: PurchaseOrderOutstandingItem[]): SourcePrItem[] {
  return outstanding
    .filter((item) => item.outstandingQuantity > 0)
    .map((item) => ({
      productId: item.productId,
      quantity: item.outstandingQuantity,
      uomId: item.uomId,
      estimatedPrice: item.estimatedPrice,
    }))
}

function prNumber(id: string): string {
  return prNumberMap.value.get(id) ?? id
}

const destinationOutletLabel = computed<string>(() => {
  if (!destinationOutletId.value) {
    return ''
  }
  return outletNames.value.get(destinationOutletId.value) ?? destinationOutletId.value
})

// Payment-term preview: estimated due date = orderDate + selected term dueDays.
const paymentTermMap = computed<Map<string, PaymentTerm>>(
  () => new Map(paymentTerms.value.map((pt) => [pt.id, pt])),
)

const duePreview = computed<string | null>(() => {
  if (!paymentTermId.value) {
    return null
  }
  const term = paymentTermMap.value.get(paymentTermId.value)
  if (!term) {
    return null
  }
  if (!orderDate.value) {
    return `Jatuh tempo ${term.dueDays} hari setelah tanggal order.`
  }
  const base = new Date(orderDate.value)
  if (Number.isNaN(base.getTime())) {
    return `Jatuh tempo ${term.dueDays} hari setelah tanggal order.`
  }
  base.setDate(base.getDate() + term.dueDays)
  return `Jatuh tempo ${term.dueDays} hari — estimasi ${formatDate(toISODate(base))} (final dihitung server).`
})

async function loadSupportingData(): Promise<void> {
  // Picker list: only APPROVED PRs that still have outstanding (≥1 item not yet
  // fully consumed by other active POs). Fully-ordered PRs are excluded via
  // `orderable: true` so they never appear as a selectable source for a new PO.
  const [allRequests, allSuppliers, paymentTermResult, allProducts, allUoms, allOutlets] =
    await Promise.all([
      fetchAllPaginated((page) =>
        purchaseRequestService.list({
          page,
          limit: PAGE_LIMIT,
          status: 'APPROVED',
          orderable: true,
        }),
      ),
      fetchAllPaginated((page) =>
        supplierService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
      ),
      paymentTermService.lookup(),
      fetchAllPaginated((page) =>
        productService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
      ),
      fetchAllPaginated((page) => uomService.list({ page, limit: PAGE_LIMIT, isActive: 'true' })),
      fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    ])
  approvedRequests.value = allRequests
  suppliers.value = allSuppliers
  paymentTerms.value = paymentTermResult
  products.value = allProducts
  uoms.value = allUoms
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
}

async function loadExisting(id: string): Promise<void> {
  const po = await purchaseOrderService.getById(id)
  loadedStatus.value = po.status
  // The picker list (`approvedRequests`) is filtered to `orderable` PRs, so a PR
  // that this PO already fully consumed would be absent — leaving the locked
  // select blank. Ensure the source PR is present so its number renders.
  if (!approvedRequests.value.some((pr) => pr.id === po.purchaseRequestId)) {
    try {
      const sourcePr = await purchaseRequestService.getById(po.purchaseRequestId)
      approvedRequests.value = [sourcePr, ...approvedRequests.value]
    } catch {
      // Non-fatal: the select may show the raw id via the prNumber fallback.
    }
  }
  // Don't let watchers overwrite the loaded values.
  suppressPrPrefill = true
  suppressSupplierDefault = true
  purchaseRequestId.value = po.purchaseRequestId
  supplierId.value = po.supplierId
  orderDate.value = po.orderDate ? po.orderDate.slice(0, 10) : toISODate(new Date())
  paymentTermId.value = po.paymentTermId ?? ''
  notes.value = po.notes ?? ''
  destinationOutletId.value = po.destinationOutletId
  // Keep the existing PO rows (their own qty/uom/price); only the per-row cap
  // comes from the outstanding endpoint below.
  items.value = po.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    uomId: item.uomId,
    unitPrice: item.unitPrice,
    taxPercent: item.taxPercent,
  }))
  // Constrain the editor to the PR's OUTSTANDING quota, EXCLUDING this PO so its
  // own consumption is added back (available again for this PO). Thus existing
  // rows with qty ≤ outstanding(exclude-self) stay valid. If the endpoint
  // fails, fall back to the PO items themselves so the product stays read-only
  // and existing quantities remain the cap.
  try {
    const outstanding = await purchaseOrderService.getOutstanding(po.purchaseRequestId, po.id)
    prItems.value = toSourcePrItems(outstanding)
  } catch {
    prItems.value = po.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      uomId: item.uomId,
      estimatedPrice: item.unitPrice,
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

// ── Reactive prefill behaviors (create mode) ─────────────────────────
// When the source PR changes, inherit its destination outlet (read-only) and
// prefill the item rows from the PR. Skipped on edit load.
watch(purchaseRequestId, async (prId) => {
  if (suppressPrPrefill) {
    suppressPrPrefill = false
    return
  }
  if (!prId) {
    destinationOutletId.value = ''
    prItems.value = []
    items.value = []
    allConsumed.value = false
    return
  }
  try {
    // Destination outlet is still inherited from the PR header (read-only).
    const pr = await purchaseRequestService.getById(prId)
    destinationOutletId.value = pr.destinationOutletId
    // Constrain the editor to the PR's OUTSTANDING quota (remaining across
    // active POs), not the raw PR quantity. Only outstanding > 0 items appear.
    const outstanding = await purchaseOrderService.getOutstanding(prId)
    const source = toSourcePrItems(outstanding)
    prItems.value = source
    allConsumed.value = source.length === 0
    // Prefill one row per outstanding item: quantity = remaining, uom/price
    // from the item, tax 0. If nothing is outstanding, start with no rows.
    items.value = source.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      uomId: item.uomId,
      unitPrice: item.estimatedPrice,
      taxPercent: 0,
    }))
  } catch (error) {
    formError.value = toMessage(error)
  }
})

// When the supplier changes, apply its default payment term if the user hasn't
// chosen one yet. Skipped on edit load.
watch(supplierId, (id) => {
  if (suppressSupplierDefault) {
    suppressSupplierDefault = false
    return
  }
  if (!id) {
    return
  }
  const supplier = suppliers.value.find((s) => s.id === id)
  if (supplier?.defaultPaymentTermId && !paymentTermId.value) {
    paymentTermId.value = supplier.defaultPaymentTermId
  }
})

// ── Validation + submit ──────────────────────────────────────────────
function validate(): string | null {
  if (!purchaseRequestId.value) {
    return 'PR sumber wajib dipilih.'
  }
  if (!supplierId.value) {
    return 'Vendor wajib dipilih.'
  }
  if (!orderDate.value) {
    return 'Tanggal order wajib diisi.'
  }
  if (allConsumed.value) {
    return 'Semua item PR ini sudah habis dipesan pada PO lain. Tidak ada sisa untuk dipesan.'
  }
  if (items.value.length === 0) {
    return 'Minimal satu item harus disertakan dari item PR sumber.'
  }
  const seen = new Set<string>()
  for (const item of items.value) {
    const label = productLabel(item.productId)
    // Product must come from an outstanding source PR item (editor enforces this).
    if (!prQtyByProduct.value.has(item.productId)) {
      return `Item ${label}: produk tidak termasuk dalam sisa item PR sumber.`
    }
    // No duplicate products (one row per PR item).
    if (seen.has(item.productId)) {
      return `Item ${label}: produk tidak boleh muncul lebih dari satu kali.`
    }
    seen.add(item.productId)
    if (!item.uomId) {
      return `Item ${label}: UOM wajib dipilih.`
    }
    if (!(Number(item.quantity) > 0)) {
      return `Item ${label}: kuantitas harus lebih dari 0.`
    }
    const maxQty = prQtyByProduct.value.get(item.productId) ?? 0
    if (maxQty > 0 && Number(item.quantity) > maxQty) {
      return `Item ${label}: melebihi sisa PR (maks ${maxQty}).`
    }
    if (Number(item.unitPrice) < 0) {
      return `Item ${label}: harga satuan tidak boleh negatif.`
    }
    if (Number(item.taxPercent) < 0) {
      return `Item ${label}: pajak tidak boleh negatif.`
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
    // Items are locked to the source PR; send only the included rows (subset
    // allowed). Validation already guarantees at least one row.
    const mappedItems = items.value.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      uomId: item.uomId,
      unitPrice: Number(item.unitPrice),
      taxPercent: Number(item.taxPercent),
    }))
    const payload: SavePurchaseOrderPayload = {
      purchaseRequestId: purchaseRequestId.value,
      supplierId: supplierId.value,
      orderDate: orderDate.value,
      paymentTermId: paymentTermId.value || undefined,
      notes: notes.value.trim() || undefined,
      items: mappedItems,
    }
    const saved = editId.value
      ? await purchaseOrderService.update(editId.value, payload)
      : await purchaseOrderService.create(payload)
    void router.push({ name: 'PurchaseOrderDetail', params: { id: saved.id } })
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

function onCancel(): void {
  void router.push({ name: 'PurchaseOrders' })
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

      <BaseAlert v-else-if="loadError" :message="loadError" size="md" />

      <form v-else class="space-y-6" @submit.prevent="onSubmit">
        <p
          v-if="isReadOnly"
          class="rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
        >
          PO ini tidak dapat diedit pada status saat ini. Ditampilkan sebagai baca-saja.
        </p>

        <!-- Header -->
        <PurchaseOrderHeaderFields
          v-model:purchase-request-id="purchaseRequestId"
          v-model:supplier-id="supplierId"
          v-model:order-date="orderDate"
          v-model:payment-term-id="paymentTermId"
          v-model:notes="notes"
          :approved-requests="approvedRequests"
          :suppliers="suppliers"
          :payment-terms="paymentTerms"
          :pr-number="prNumber"
          :destination-outlet-label="destinationOutletLabel"
          :due-preview="duePreview"
          :disabled="isReadOnly"
          :pr-locked="isEdit"
        />

        <!-- Line items -->
        <div>
          <h5 class="mb-3 section-title">Item</h5>
          <p
            v-if="allConsumed"
            class="mb-3 rounded-lg border border-warning-500/40 bg-warning-50 px-4 py-3 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
            role="alert"
          >
            Semua item PR ini sudah habis dipesan pada PO lain. Tidak ada sisa (outstanding) yang
            bisa dipesan, sehingga PO tidak dapat dibuat.
          </p>
          <PurchaseOrderItemsEditor
            v-model="items"
            :pr-items="prItems"
            :products="products"
            :uoms="uoms"
            :disabled="isReadOnly"
          />
        </div>

        <BaseAlert v-if="formError" :message="formError" size="sm" />

        <div class="button-row pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </BaseButton>
          <BaseButton
            v-if="!isReadOnly"
            type="submit"
            variant="primary"
            :disabled="submitting || allConsumed"
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
