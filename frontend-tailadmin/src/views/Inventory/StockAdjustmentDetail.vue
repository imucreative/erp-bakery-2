<script setup lang="ts">
/**
 * StockAdjustmentDetail — full-page read-only view of a Stock Adjustment:
 * header meta (summary) + line items (with before→after once COMPLETED).
 * Renders status- and permission-aware lifecycle actions (canTransition is
 * mirrored from the backend — actions outside the current transition are never
 * shown):
 *
 *   DRAFT     → Edit (.update), Submit (.update), Cancel (.update)
 *   SUBMITTED → Approve (.approve), Cancel (.update)
 *   APPROVED  → Complete (.complete — posts stock, final; NO cancel)
 *   COMPLETED → terminal (no actions)
 *   CANCELLED → terminal (no actions)
 *
 * The backend lifecycle endpoints take no body, so each action is a plain
 * confirmation modal. Mutations keep the user on the page; backend errors
 * (409 invalid transition, 400 insufficient stock/validation) surface in the
 * modal, keeping the current state intact.
 *
 * The entity exposes no status-log collection, so there is no timeline section.
 * This view owns all state and handlers; presentation is delegated to stateless
 * feature sub-components (summary, items table, action bar, modals).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import {
  StockAdjustmentSummary,
  StockAdjustmentItemsTable,
  StockAdjustmentActionBar,
  StockAdjustmentActionModals,
  type StockAdjustmentAction,
} from '@/components/inventory/stock-adjustment'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { inventoryService } from '@/services/inventory.service'
import { stockAdjustmentService, type StockAdjustment } from '@/services/stock-adjustment.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const adjustmentId = computed<string>(() => String(route.params.id))

const adjustment = ref<StockAdjustment | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const batchNumbers = ref<Map<string, string>>(new Map())

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}
function batchLabel(id: string): string {
  return batchNumbers.value.get(id) ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canUpdate = computed<boolean>(() => can('inventory.adjustment.update'))
const canApprove = computed<boolean>(() => can('inventory.adjustment.approve'))
const canComplete = computed<boolean>(() => can('inventory.adjustment.complete'))

const status = computed<StockAdjustment['status'] | null>(() => adjustment.value?.status ?? null)

const showEdit = computed<boolean>(() => canUpdate.value && status.value === 'DRAFT')
const showSubmit = computed<boolean>(() => canUpdate.value && status.value === 'DRAFT')
const showApprove = computed<boolean>(() => canApprove.value && status.value === 'SUBMITTED')
const showComplete = computed<boolean>(() => canComplete.value && status.value === 'APPROVED')
const showCancel = computed<boolean>(
  () => canUpdate.value && (status.value === 'DRAFT' || status.value === 'SUBMITTED'),
)
const hasAnyAction = computed<boolean>(
  () =>
    showEdit.value ||
    showSubmit.value ||
    showApprove.value ||
    showComplete.value ||
    showCancel.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(outletId: string): Promise<void> {
  const [allOutlets, allProducts, allBatches] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
    // Batches of the adjustment's outlet (include non-batch to resolve any id).
    fetchAllPaginated((page) =>
      inventoryService.getBatches({ page, limit: PAGE_LIMIT, outletId, includeNonBatch: true }),
    ),
  ])
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  batchNumbers.value = new Map(
    allBatches.map((entry) => [entry.batch.id, entry.batch.batchNumber || '(tanpa batch)']),
  )
}

async function loadAdjustment(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const detail = await stockAdjustmentService.getById(adjustmentId.value)
    adjustment.value = detail
    await loadLookups(detail.outletId)
  } catch (error) {
    loadError.value = toMessage(error)
    adjustment.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadAdjustment()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<StockAdjustmentAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'InventoryStockAdjustmentEdit', params: { id: adjustmentId.value } })
}

function goToList(): void {
  void router.push({ name: 'InventoryStockAdjustments' })
}

function openAction(action: StockAdjustmentAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(): Promise<void> {
  if (!adjustment.value || !activeAction.value) {
    return
  }
  const id = adjustment.value.id
  const action = activeAction.value
  actionSubmitting.value = true
  actionError.value = null
  try {
    let updated: StockAdjustment
    if (action === 'submit') {
      updated = await stockAdjustmentService.submit(id)
    } else if (action === 'approve') {
      updated = await stockAdjustmentService.approve(id)
    } else if (action === 'complete') {
      updated = await stockAdjustmentService.complete(id)
    } else {
      updated = await stockAdjustmentService.cancel(id)
    }
    adjustment.value = updated
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
    <PageBreadcrumb :pageTitle="'Detail Stock Adjustment'" />

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

    <template v-else-if="adjustment">
      <!-- Page header: back (icon-only) + title on the start, lifecycle actions on the end -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <BaseButton
            variant="outline"
            icon-only
            aria-label="Kembali ke Daftar"
            title="Kembali ke Daftar"
            class="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
            @click="goToList"
          >
            <ChevronLeft class="h-5 w-5 rtl:rotate-180" aria-hidden="true" />
          </BaseButton>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            {{ adjustment.adjustmentNumber }}
          </h3>
        </div>

        <StockAdjustmentActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-submit="showSubmit"
          :show-approve="showApprove"
          :show-complete="showComplete"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @submit="openAction('submit')"
          @approve="openAction('approve')"
          @complete="openAction('complete')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Penyesuaian Stok">
          <!-- Action error banner (mutation failures keep user here) -->
          <p
            v-if="actionError"
            class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          >
            {{ actionError }}
          </p>

          <StockAdjustmentSummary :adjustment="adjustment" :outlet-name="outletName" />

          <div class="mt-6">
            <StockAdjustmentItemsTable
              :adjustment="adjustment"
              :product-name="productName"
              :batch-label="batchLabel"
            />
          </div>

          <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada aksi untuk status ini.
          </p>
        </ComponentCard>
      </div>
    </template>

    <StockAdjustmentActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
