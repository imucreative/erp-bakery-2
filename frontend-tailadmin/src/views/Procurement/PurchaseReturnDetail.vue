<script setup lang="ts">
/**
 * PurchaseReturnDetail — full-page read-only view of a Purchase Return: header
 * meta (summary) + returned line items, plus a vertical status timeline built
 * from `statusLogs`. Renders status- and permission-aware lifecycle actions:
 *
 *   DRAFT     → Edit (return.update), Submit (return.create), Cancel (return.update)
 *   SUBMITTED → Complete (return.complete — posts inventory reversal, final),
 *               Cancel (return.update)
 *   COMPLETED → terminal (no actions; reversal already posted)
 *   CANCELLED → terminal (no actions)
 *
 * Submit/complete/cancel go through a confirmation modal. Mutations keep the
 * user on the page; backend errors surface in the modal or an inline banner.
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
import { BaseButton } from '@/components/ui'
import {
  PurchaseReturnSummary,
  PurchaseReturnItemsTable,
  PurchaseReturnActionBar,
  PurchaseReturnTimeline,
  PurchaseReturnActionModals,
  PurchaseReturnComments,
  PurchaseReturnAttachments,
  type PurchaseReturnAction,
} from '@/components/procurement/purchase-return'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/usePurchaseRequests'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import { supplierService } from '@/services/supplier.service'
import { goodsReceiptService } from '@/services/goods-receipt.service'
import { purchaseReturnService, type PurchaseReturn } from '@/services/purchase-return.service'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const prId = computed<string>(() => String(route.params.id))

const pr = ref<PurchaseReturn | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())
const supplierNames = ref<Map<string, string>>(new Map())
const grNumbers = ref<Map<string, string>>(new Map())

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
function grNumber(id: string): string {
  return grNumbers.value.get(id) ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canUpdate = computed<boolean>(() => can('procurement.return.update'))
const canCreate = computed<boolean>(() => can('procurement.return.create'))
const canComplete = computed<boolean>(() => can('procurement.return.complete'))

const status = computed<PurchaseReturn['status'] | null>(() => pr.value?.status ?? null)

const showEdit = computed<boolean>(() => canUpdate.value && status.value === 'DRAFT')
const showSubmit = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showComplete = computed<boolean>(() => canComplete.value && status.value === 'SUBMITTED')
const showCancel = computed<boolean>(
  () => canUpdate.value && (status.value === 'DRAFT' || status.value === 'SUBMITTED'),
)
const hasAnyAction = computed<boolean>(
  () => showEdit.value || showSubmit.value || showComplete.value || showCancel.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(): Promise<void> {
  const [allOutlets, allProducts, allUoms, allSuppliers, allReceipts] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => uomService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => supplierService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => goodsReceiptService.list({ page, limit: PAGE_LIMIT })),
  ])
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  uomNames.value = new Map(allUoms.map((u) => [u.id, u.name]))
  supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
  grNumbers.value = new Map(allReceipts.map((gr) => [gr.id, gr.grNumber]))
}

async function loadPr(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const [detail] = await Promise.all([purchaseReturnService.getById(prId.value), loadLookups()])
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
const activeAction = ref<PurchaseReturnAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'PurchaseReturnEdit', params: { id: prId.value } })
}

function goToList(): void {
  void router.push({ name: 'PurchaseReturns' })
}

function openAction(action: PurchaseReturnAction): void {
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
    if (activeAction.value === 'submit') {
      pr.value = await purchaseReturnService.submit(id, { note: note || undefined })
    } else if (activeAction.value === 'complete') {
      pr.value = await purchaseReturnService.complete(id, { note: note || undefined })
    } else if (activeAction.value === 'cancel') {
      pr.value = await purchaseReturnService.cancel(id, { note: note || undefined })
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
    <PageBreadcrumb :pageTitle="'Detail Purchase Return'" />

    <div
      v-if="loading"
      class="text-muted rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-gray-800 dark:bg-white/[0.03]"
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

    <template v-else-if="pr">
      <!-- Page header: back (icon-only) + title on the start, lifecycle actions on the end -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <BaseButton
            variant="outline"
            icon-only
            aria-label="Kembali ke Daftar"
            title="Kembali ke Daftar"
            class="h-10 w-10"
            @click="goToList"
          >
            <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </BaseButton>
          <h3 class="card-title">
            {{ pr.returnNumber }}
          </h3>
        </div>

        <PurchaseReturnActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-submit="showSubmit"
          :show-complete="showComplete"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @submit="openAction('submit')"
          @complete="openAction('complete')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Main column: summary + items -->
        <div class="space-y-5 lg:col-span-2">
          <ComponentCard title="Informasi Purchase Return">
            <!-- Action error banner (mutation failures keep user here) -->
            <p v-if="actionError" class="alert-error mb-4 px-3 py-2">
              {{ actionError }}
            </p>

            <PurchaseReturnSummary
              :pr="pr"
              :gr-number="grNumber"
              :supplier-name="supplierName"
              :outlet-name="outletName"
            />

            <div class="mt-6">
              <PurchaseReturnItemsTable :pr="pr" :product-name="productName" :uom-name="uomName" />
            </div>

            <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
              Tidak ada aksi untuk status ini.
            </p>
          </ComponentCard>
        </div>

        <!-- Side column: status timeline, comments, attachments -->
        <div class="space-y-5 lg:col-span-1">
          <ComponentCard title="Riwayat Status">
            <PurchaseReturnTimeline :logs="pr.statusLogs" />
          </ComponentCard>
          <ComponentCard title="Komentar">
            <PurchaseReturnComments :purchase-return-id="pr.id" />
          </ComponentCard>
          <ComponentCard title="Lampiran">
            <PurchaseReturnAttachments :purchase-return-id="pr.id" :can-manage="canUpdate" />
          </ComponentCard>
        </div>
      </div>
    </template>

    <PurchaseReturnActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
