<script setup lang="ts">
/**
 * PurchaseOrderDetail — full-page read-only view of a Purchase Order: header
 * meta (summary) + line items + totals, plus a vertical approval timeline built
 * from `statusLogs`. Renders status- and permission-aware lifecycle actions:
 *
 *   DRAFT     → Edit (po.update), Submit (po.create), Cancel (po.update)
 *   SUBMITTED → Approve (po.approve), Reject (po.approve, note required)
 *   REJECTED  → Edit, Cancel
 *   APPROVED  → Cancel (po.update) — PO may be cancelled after approval
 *   CANCELLED → terminal (no actions)
 *
 * Approve/reject/cancel go through a confirmation modal. Mutations keep the
 * user on the page; backend errors (409 invalid transition, 400 validation)
 * surface in the modal or an inline banner.
 *
 * This view owns all state and handlers; presentation is delegated to stateless
 * feature sub-components (summary, items table, action bar, timeline, modals).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  PurchaseOrderSummary,
  PurchaseOrderItemsTable,
  PurchaseOrderActionBar,
  PurchaseOrderTimeline,
  PurchaseOrderActionModals,
  PurchaseOrderComments,
  type PurchaseOrderAction,
} from '@/components/procurement/purchase-order'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import { supplierService } from '@/services/supplier.service'
import { purchaseRequestService } from '@/services/purchase-request.service'
import { purchaseOrderService, type PurchaseOrder } from '@/services/purchase-order.service'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const poId = computed<string>(() => String(route.params.id))

const po = ref<PurchaseOrder | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())
const supplierNames = ref<Map<string, string>>(new Map())
const prNumbers = ref<Map<string, string>>(new Map())

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}
function uomName(id: string): string {
  return uomNames.value.get(id) ?? id
}
function supplierName(id: string): string {
  return supplierNames.value.get(id) ?? id
}
function prNumber(id: string): string {
  return prNumbers.value.get(id) ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canCreate = computed<boolean>(() => can('procurement.po.create'))
const canUpdate = computed<boolean>(() => can('procurement.po.update'))
const canApprove = computed<boolean>(() => can('procurement.po.approve'))

const status = computed<PurchaseOrder['status'] | null>(() => po.value?.status ?? null)

const showEdit = computed<boolean>(
  () => canUpdate.value && (status.value === 'DRAFT' || status.value === 'REJECTED'),
)
const showSubmit = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showCancel = computed<boolean>(
  () =>
    canUpdate.value &&
    (status.value === 'DRAFT' || status.value === 'REJECTED' || status.value === 'APPROVED'),
)
const showApprove = computed<boolean>(() => canApprove.value && status.value === 'SUBMITTED')
const showReject = computed<boolean>(() => canApprove.value && status.value === 'SUBMITTED')
const hasAnyAction = computed<boolean>(
  () =>
    showEdit.value ||
    showSubmit.value ||
    showCancel.value ||
    showApprove.value ||
    showReject.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(): Promise<void> {
  const [outletResult, productResult, uomResult, supplierResult, prResult] = await Promise.all([
    outletService.list({ page: 1, limit: 100 }),
    productService.list({ page: 1, limit: 100 }),
    uomService.list({ page: 1, limit: 100 }),
    supplierService.list({ page: 1, limit: 100 }),
    purchaseRequestService.list({ page: 1, limit: 100 }),
  ])
  outletNames.value = new Map(outletResult.items.map((o) => [o.id, o.name]))
  productNames.value = new Map(productResult.items.map((p) => [p.id, `${p.name} (${p.sku})`]))
  uomNames.value = new Map(uomResult.items.map((u) => [u.id, u.name]))
  supplierNames.value = new Map(supplierResult.items.map((s) => [s.id, s.name]))
  prNumbers.value = new Map(prResult.items.map((pr) => [pr.id, pr.prNumber]))
}

async function loadPo(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const [detail] = await Promise.all([purchaseOrderService.getById(poId.value), loadLookups()])
    po.value = detail
  } catch (error) {
    loadError.value = toMessage(error)
    po.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPo()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<PurchaseOrderAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'PurchaseOrderEdit', params: { id: poId.value } })
}

function goToList(): void {
  void router.push({ name: 'PurchaseOrders' })
}

async function doSubmit(): Promise<void> {
  if (!po.value) {
    return
  }
  actionError.value = null
  actionSubmitting.value = true
  try {
    po.value = await purchaseOrderService.submit(po.value.id)
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

function openAction(action: PurchaseOrderAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(note: string): Promise<void> {
  if (!po.value || !activeAction.value) {
    return
  }
  const id = po.value.id
  actionSubmitting.value = true
  actionError.value = null
  try {
    if (activeAction.value === 'approve') {
      po.value = await purchaseOrderService.approve(id, { note: note || undefined })
    } else if (activeAction.value === 'reject') {
      po.value = await purchaseOrderService.reject(id, { note })
    } else if (activeAction.value === 'cancel') {
      po.value = await purchaseOrderService.cancel(id, { note: note || undefined })
    }
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="'Detail Purchase Order'" />

    <div
      v-if="loading"
      class="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400"
    >
      Memuat data...
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </div>

    <template v-else-if="po">
      <!-- Page header: back (icon-only) + title on the start, lifecycle actions on the end -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <button
            type="button"
            aria-label="Kembali ke Daftar"
            title="Kembali ke Daftar"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
            @click="goToList"
          >
            <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </button>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ po.poNumber }}
          </h3>
        </div>

        <PurchaseOrderActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-submit="showSubmit"
          :show-approve="showApprove"
          :show-reject="showReject"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @submit="doSubmit"
          @approve="openAction('approve')"
          @reject="openAction('reject')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Main column: summary + items -->
        <div class="space-y-5 lg:col-span-2">
          <ComponentCard title="Informasi Purchase Order">
            <!-- Action error banner (mutation failures keep user here) -->
            <p
              v-if="actionError"
              class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
            >
              {{ actionError }}
            </p>

            <PurchaseOrderSummary
              :po="po"
              :pr-number="prNumber"
              :supplier-name="supplierName"
              :outlet-name="outletName"
            />

            <div class="mt-6">
              <PurchaseOrderItemsTable
                :po="po"
                :product-name="productName"
                :uom-name="uomName"
              />
            </div>

            <p
              v-if="!hasAnyAction"
              class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500"
            >
              Tidak ada aksi untuk status ini.
            </p>
          </ComponentCard>
        </div>

        <!-- Side column: approval timeline -->
        <div class="space-y-5 lg:col-span-1">
          <ComponentCard title="Riwayat Persetujuan">
            <PurchaseOrderTimeline :logs="po.statusLogs" />
          </ComponentCard>
          <ComponentCard title="Komentar">
            <PurchaseOrderComments :purchase-order-id="po.id" />
          </ComponentCard>
        </div>
      </div>
    </template>

    <PurchaseOrderActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
