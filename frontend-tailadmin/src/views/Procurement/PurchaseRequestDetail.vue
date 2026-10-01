<script setup lang="ts">
/**
 * PurchaseRequestDetail — full-page read-only view of a Purchase Request:
 * header meta + line items + total, plus a vertical approval timeline built
 * from `statusLogs`, comments, and attachments. Renders status- and
 * permission-aware lifecycle actions:
 *
 *   DRAFT     → Edit, Submit (pr.create), Cancel (pr.update)
 *   SUBMITTED → Approve (pr.approve), Reject (pr.approve, note required)
 *   REJECTED  → Edit, Cancel
 *   APPROVED / CANCELLED → terminal (no actions)
 *
 * Approve/reject/cancel go through a confirmation modal. Mutations keep the
 * user on the page; backend errors (409 invalid transition, 400 validation)
 * surface in the modal or an inline banner.
 *
 * This view owns all state and handlers; presentation is delegated to feature
 * sub-components (summary, items table, action bar, timeline, comments,
 * attachments), which are stateless and communicate via props/events.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  PurchaseRequestSummary,
  PurchaseRequestItemsTable,
  PurchaseRequestActionBar,
  PurchaseRequestTimeline,
  PurchaseRequestActionModals,
  PurchaseRequestComments,
  PurchaseRequestAttachments,
  type PurchaseRequestAction,
} from '@/components/procurement/purchase-request'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/usePurchaseRequests'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import {
  purchaseRequestService,
  type PurchaseRequest,
} from '@/services/purchase-request.service'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const prId = computed<string>(() => String(route.params.id))

const pr = ref<PurchaseRequest | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}
function uomName(id: string): string {
  return uomNames.value.get(id) ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canCreate = computed<boolean>(() => can('procurement.pr.create'))
const canUpdate = computed<boolean>(() => can('procurement.pr.update'))
const canApprove = computed<boolean>(() => can('procurement.pr.approve'))

const status = computed<PurchaseRequest['status'] | null>(() => pr.value?.status ?? null)

const showEdit = computed<boolean>(
  () => canUpdate.value && (status.value === 'DRAFT' || status.value === 'REJECTED'),
)
const showSubmit = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showCancel = computed<boolean>(
  () => canUpdate.value && (status.value === 'DRAFT' || status.value === 'REJECTED'),
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
  const [outletResult, productResult, uomResult] = await Promise.all([
    outletService.list({ page: 1, limit: 100, isActive: 'true' }),
    productService.list({ page: 1, limit: 100 }),
    uomService.list({ page: 1, limit: 100 }),
  ])
  outletNames.value = new Map(outletResult.items.map((o) => [o.id, o.name]))
  productNames.value = new Map(productResult.items.map((p) => [p.id, `${p.name} (${p.sku})`]))
  uomNames.value = new Map(uomResult.items.map((u) => [u.id, u.name]))
}

async function loadPr(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const [detail] = await Promise.all([purchaseRequestService.getById(prId.value), loadLookups()])
    pr.value = detail
  } catch (error) {
    loadError.value = toMessage(error)
    pr.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadPr()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<PurchaseRequestAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'PurchaseRequestEdit', params: { id: prId.value } })
}

function goToList(): void {
  void router.push({ name: 'PurchaseRequests' })
}

async function doSubmit(): Promise<void> {
  if (!pr.value) {
    return
  }
  actionError.value = null
  actionSubmitting.value = true
  try {
    pr.value = await purchaseRequestService.submit(pr.value.id)
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

function openAction(action: PurchaseRequestAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(note: string): Promise<void> {
  if (!pr.value || !activeAction.value) {
    return
  }
  const id = pr.value.id
  actionSubmitting.value = true
  actionError.value = null
  try {
    if (activeAction.value === 'approve') {
      pr.value = await purchaseRequestService.approve(id, { note: note || undefined })
    } else if (activeAction.value === 'reject') {
      pr.value = await purchaseRequestService.reject(id, { note })
    } else if (activeAction.value === 'cancel') {
      pr.value = await purchaseRequestService.cancel(id, { note: note || undefined })
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
    <PageBreadcrumb :pageTitle="'Detail Purchase Request'" />

    <div v-if="loading" class="rounded-2xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </div>

    <template v-else-if="pr">
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
            {{ pr.prNumber }}
          </h3>
        </div>

        <PurchaseRequestActionBar
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
          <ComponentCard title="Informasi Purchase Request">
            <!-- Action error banner (mutation failures keep user here) -->
            <p
              v-if="actionError"
              class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
            >
              {{ actionError }}
            </p>

            <PurchaseRequestSummary :pr="pr" :outlet-name="outletName" />

            <div class="mt-6">
              <PurchaseRequestItemsTable
                :pr="pr"
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

        <!-- Side column: approval timeline + comments + attachments -->
        <div class="space-y-5 lg:col-span-1">
          <ComponentCard title="Riwayat Persetujuan">
            <PurchaseRequestTimeline :logs="pr.statusLogs" />
          </ComponentCard>
          <ComponentCard title="Komentar">
            <PurchaseRequestComments :purchase-request-id="pr.id" />
          </ComponentCard>
          <ComponentCard title="Lampiran">
            <PurchaseRequestAttachments :purchase-request-id="pr.id" :can-manage="canUpdate" />
          </ComponentCard>
        </div>
      </div>
    </template>

    <PurchaseRequestActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
