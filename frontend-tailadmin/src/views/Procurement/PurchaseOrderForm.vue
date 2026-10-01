<script setup lang="ts">
/**
 * PurchaseOrderForm — full-page create/edit form for a Purchase Order.
 * A page (not a modal) because line items need room (document-page standard).
 *
 * CREATE (route `PurchaseOrderCreate`): empty header. The user picks an
 *   APPROVED source PR and a supplier. On PR selection the destination outlet
 *   is shown read-only (inherited on the backend) and the PR's items are
 *   prefilled into the editor (product/qty/uom from the PR, unitPrice defaulted
 *   from the PR estimatedPrice, taxPercent 0). On supplier selection the
 *   supplier's default payment term is applied when the user hasn't overridden.
 * EDIT (route `PurchaseOrderEdit`, :id): loads the PO. Editing is only allowed
 *   for DRAFT/REJECTED; any other status renders read-only with save hidden.
 *   The source PR is locked on edit.
 *
 * Decision — item prefill: we prefill client-side from the chosen PR so the
 * user can review/adjust prices and tax before submitting. If the user clears
 * all rows we send `items: undefined` and let the backend prefill from the PR.
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
import Button from '@/components/ui/Button.vue'
import {
  PurchaseOrderHeaderFields,
  PurchaseOrderItemsEditor,
  type EditorItemRow,
} from '@/components/procurement/purchase-order'
import { formatDate, toISODate } from '@/lib/format'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import { uomService, type Uom } from '@/services/uom.service'
import { supplierService, type Supplier } from '@/services/supplier.service'
import { paymentTermService, type PaymentTerm } from '@/services/payment-term.service'
import {
  purchaseRequestService,
  type PurchaseRequest,
} from '@/services/purchase-request.service'
import {
  purchaseOrderService,
  type PurchaseOrder,
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
  const [prResult, supplierResult, paymentTermResult, productResult, uomResult, outletResult] =
    await Promise.all([
      purchaseRequestService.list({ page: 1, limit: 100, status: 'APPROVED' }),
      supplierService.list({ page: 1, limit: 100, isActive: 'true' }),
      paymentTermService.lookup(),
      productService.list({ page: 1, limit: 100, isActive: 'true' }),
      uomService.list({ page: 1, limit: 100, isActive: 'true' }),
      outletService.list({ page: 1, limit: 100 }),
    ])
  approvedRequests.value = prResult.items
  suppliers.value = supplierResult.items
  paymentTerms.value = paymentTermResult
  products.value = productResult.items
  uoms.value = uomResult.items
  outletNames.value = new Map(outletResult.items.map((o) => [o.id, o.name]))
}

async function loadExisting(id: string): Promise<void> {
  const po = await purchaseOrderService.getById(id)
  loadedStatus.value = po.status
  // Don't let watchers overwrite the loaded values.
  suppressPrPrefill = true
  suppressSupplierDefault = true
  purchaseRequestId.value = po.purchaseRequestId
  supplierId.value = po.supplierId
  orderDate.value = po.orderDate ? po.orderDate.slice(0, 10) : toISODate(new Date())
  paymentTermId.value = po.paymentTermId ?? ''
  notes.value = po.notes ?? ''
  destinationOutletId.value = po.destinationOutletId
  items.value = po.items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    uomId: item.uomId,
    unitPrice: item.unitPrice,
    taxPercent: item.taxPercent,
  }))
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
    return
  }
  try {
    const pr = await purchaseRequestService.getById(prId)
    destinationOutletId.value = pr.destinationOutletId
    items.value = pr.items.map((item) => ({
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
  for (const [index, item] of items.value.entries()) {
    const row = index + 1
    if (!item.productId) {
      return `Item ${row}: produk wajib dipilih.`
    }
    if (!item.uomId) {
      return `Item ${row}: UOM wajib dipilih (pilih ulang produk agar UOM terisi).`
    }
    if (!(Number(item.quantity) > 0)) {
      return `Item ${row}: kuantitas harus lebih dari 0.`
    }
    if (Number(item.unitPrice) < 0) {
      return `Item ${row}: harga satuan tidak boleh negatif.`
    }
    if (Number(item.taxPercent) < 0) {
      return `Item ${row}: pajak tidak boleh negatif.`
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
    // Empty editor → omit items and let the backend prefill from the PR.
    const mappedItems =
      items.value.length > 0
        ? items.value.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            uomId: item.uomId,
            unitPrice: Number(item.unitPrice),
            taxPercent: Number(item.taxPercent),
          }))
        : undefined
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
      <button
        type="button"
        aria-label="Kembali ke Daftar"
        title="Kembali ke Daftar"
        class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
        @click="onCancel"
      >
        <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
      </button>
      <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ pageTitle }}
      </h3>
    </div>

    <ComponentCard :title="pageTitle">
      <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat data...
      </div>

      <div
        v-else-if="loadError"
        class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        role="alert"
      >
        {{ loadError }}
      </div>

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
          <h5 class="mb-3 text-sm font-semibold text-gray-800 dark:text-white/90">Item</h5>
          <PurchaseOrderItemsEditor
            v-model="items"
            :products="products"
            :uoms="uoms"
            :disabled="isReadOnly"
          />
        </div>

        <p
          v-if="formError"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ formError }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="onCancel">
            {{ isReadOnly ? 'Kembali' : 'Batal' }}
          </Button>
          <button
            v-if="!isReadOnly"
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan sebagai Draft' }}
          </button>
        </div>
      </form>
    </ComponentCard>
  </AdminLayout>
</template>
