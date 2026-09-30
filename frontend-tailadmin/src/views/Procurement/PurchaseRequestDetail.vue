<script setup lang="ts">
/**
 * PurchaseRequestDetail — full-page read-only view of a Purchase Request:
 * header + line items + total, plus a vertical approval timeline built from
 * `statusLogs`. Renders status- and permission-aware lifecycle actions:
 *
 *   DRAFT     → Edit, Submit (pr.create), Cancel (pr.update)
 *   SUBMITTED → Approve (pr.approve), Reject (pr.approve, note required)
 *   REJECTED  → Edit, Cancel
 *   APPROVED / CANCELLED → terminal (no actions)
 *
 * Approve/reject/cancel go through a confirmation modal. Mutations keep the
 * user on the page; backend errors (409 invalid transition, 400 validation)
 * surface in the modal or an inline banner.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Pencil, Send, Check, X, Ban } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import {
  PurchaseRequestTimeline,
  PurchaseRequestActionModals,
  PurchaseRequestComments,
  PurchaseRequestAttachments,
  type PurchaseRequestAction,
} from '@/components/procurement/purchase-request'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/usePurchaseRequests'
import { formatDate, formatDateTime, formatRupiah } from '@/lib/format'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import {
  purchaseRequestService,
  PURCHASE_REQUEST_STATUS_LABELS,
  statusBadgeColor,
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
    productService.list({ page: 1, limit: 200 }),
    uomService.list({ page: 1, limit: 200 }),
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

    <div v-else-if="pr" class="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <!-- Main column: header + items -->
      <div class="space-y-5 lg:col-span-2">
        <ComponentCard :title="pr.prNumber">
          <!-- Action error banner (mutation failures keep user here) -->
          <p
            v-if="actionError"
            class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          >
            {{ actionError }}
          </p>

          <!-- Header meta -->
          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
              <dd class="mt-1">
                <Badge :color="statusBadgeColor(pr.status)">
                  {{ PURCHASE_REQUEST_STATUS_LABELS[pr.status] }}
                </Badge>
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet Tujuan</dt>
              <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
                {{ outletName(pr.destinationOutletId) }}
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Dibutuhkan</dt>
              <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
                {{ formatDate(pr.expectedDate) }}
              </dd>
            </div>
            <div>
              <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
              <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
                {{ formatDateTime(pr.createdAt) }}
              </dd>
            </div>
            <div v-if="pr.notes" class="sm:col-span-2">
              <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Catatan</dt>
              <dd class="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{{ pr.notes }}</dd>
            </div>
          </dl>

          <!-- Items -->
          <div class="mt-6 overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
            <table class="min-w-full">
              <thead>
                <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
                  <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Produk
                  </th>
                  <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Qty
                  </th>
                  <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    UOM
                  </th>
                  <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Estimasi Harga
                  </th>
                  <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in pr.items"
                  :key="item.id"
                  class="border-b border-gray-100 last:border-0 dark:border-gray-800"
                >
                  <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
                    {{ productName(item.productId) }}
                  </td>
                  <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ item.quantity }}
                  </td>
                  <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ uomName(item.uomId) }}
                  </td>
                  <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
                    {{ formatRupiah(item.estimatedPrice) }}
                  </td>
                  <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
                    {{ formatRupiah(item.subtotal) }}
                  </td>
                </tr>
              </tbody>
              <tfoot>
                <tr class="border-t border-gray-200 dark:border-gray-800">
                  <td
                    colspan="4"
                    class="px-4 py-3 text-end text-theme-sm font-medium text-gray-600 dark:text-gray-300"
                  >
                    Total Estimasi
                  </td>
                  <td class="px-4 py-3 text-end text-theme-sm font-semibold text-gray-800 dark:text-white/90">
                    {{ formatRupiah(pr.totalEstimatedAmount) }}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Actions -->
          <div class="mt-6 flex flex-wrap items-center gap-3">
            <button
              v-if="showEdit"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
              @click="goToEdit"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
              Edit
            </button>
            <button
              v-if="showSubmit"
              type="button"
              :disabled="actionSubmitting"
              class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
              @click="doSubmit"
            >
              <Send class="h-4 w-4" aria-hidden="true" />
              {{ actionSubmitting ? 'Memproses...' : 'Ajukan' }}
            </button>
            <button
              v-if="showApprove"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-success-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-success-600"
              @click="openAction('approve')"
            >
              <Check class="h-4 w-4" aria-hidden="true" />
              Setujui
            </button>
            <button
              v-if="showReject"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600"
              @click="openAction('reject')"
            >
              <X class="h-4 w-4" aria-hidden="true" />
              Tolak
            </button>
            <button
              v-if="showCancel"
              type="button"
              class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
              @click="openAction('cancel')"
            >
              <Ban class="h-4 w-4" aria-hidden="true" />
              Batalkan
            </button>

            <span
              v-if="!hasAnyAction"
              class="text-theme-sm text-gray-400 dark:text-gray-500"
            >
              Tidak ada aksi untuk status ini.
            </span>

            <Button size="sm" variant="outline" :on-click="goToList" class-name="ms-auto">
              Kembali ke Daftar
            </Button>
          </div>
        </ComponentCard>
      </div>

      <!-- Side column: approval timeline + comments -->
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

    <PurchaseRequestActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
