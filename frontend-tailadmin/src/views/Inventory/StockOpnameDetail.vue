<script setup lang="ts">
/**
 * StockOpnameDetail — full-page view of a Stock Opname: header meta (summary) +
 * line items. While COUNTING the items table exposes an inline "Qty Fisik"
 * input per row (record-count); outside COUNTING the counted/difference columns
 * are read-only. Renders status- and permission-aware lifecycle actions
 * (mirrored from the backend — actions outside the current transition are never
 * shown):
 *
 *   DRAFT     → Start Counting (.create), Cancel (.update)
 *   COUNTING  → Submit (.update), Cancel (.update)
 *   SUBMITTED → Approve (.approve), Cancel (.update)
 *   APPROVED  → Complete (.complete — posts stock, final; NO cancel)
 *   COMPLETED → terminal (no actions)
 *   CANCELLED → terminal (no actions)
 *
 * Lifecycle endpoints take no body, so each action is a plain confirmation
 * modal. Mutations keep the user on the page; backend errors (409 invalid
 * transition, 400 outlet-locked / insufficient stock) surface in the modal (or
 * an inline banner for the per-row count), keeping the current state intact.
 *
 * On Complete, when the backend reconciled a non-zero variance it returns a
 * `generatedAdjustmentId`; the summary then links to that Stock Adjustment.
 *
 * This view owns all state and handlers; presentation is delegated to stateless
 * feature sub-components (summary, items table, action bar, modals). Item names
 * are sparse (ids only), so product/batch/outlet names are resolved via
 * one-time lookups like StockAdjustmentDetail.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import {
  StockOpnameSummary,
  StockOpnameItemsTable,
  StockOpnameActionBar,
  StockOpnameActionModals,
  type StockOpnameAction,
} from '@/components/inventory/stock-opname'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { inventoryService } from '@/services/inventory.service'
import { stockOpnameService, type StockOpname } from '@/services/stock-opname.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const opnameId = computed<string>(() => String(route.params.id))

const opname = ref<StockOpname | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)
const countError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the view (items are sparse).
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
const canCreate = computed<boolean>(() => can('inventory.stock-count.create'))
const canUpdate = computed<boolean>(() => can('inventory.stock-count.update'))
const canApprove = computed<boolean>(() => can('inventory.stock-count.approve'))
const canComplete = computed<boolean>(() => can('inventory.stock-count.complete'))

const status = computed<StockOpname['status'] | null>(() => opname.value?.status ?? null)

const showStart = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showSubmit = computed<boolean>(() => canUpdate.value && status.value === 'COUNTING')
const showApprove = computed<boolean>(() => canApprove.value && status.value === 'SUBMITTED')
const showComplete = computed<boolean>(() => canComplete.value && status.value === 'APPROVED')
const showCancel = computed<boolean>(
  () =>
    canUpdate.value &&
    (status.value === 'DRAFT' || status.value === 'COUNTING' || status.value === 'SUBMITTED'),
)
const hasAnyAction = computed<boolean>(
  () =>
    showStart.value ||
    showSubmit.value ||
    showApprove.value ||
    showComplete.value ||
    showCancel.value,
)

// Inline per-row count is only possible while COUNTING and with .update.
const itemsEditable = computed<boolean>(() => canUpdate.value && status.value === 'COUNTING')

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(outletId: string): Promise<void> {
  const [allOutlets, allProducts, allBatches] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
    // Batches of the opname's outlet (include non-batch to resolve any id).
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

async function loadOpname(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const detail = await stockOpnameService.getById(opnameId.value)
    opname.value = detail
    await loadLookups(detail.outletId)
  } catch (error) {
    loadError.value = toMessage(error)
    opname.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOpname()
})

// ── Inline count (COUNTING) ──────────────────────────────────────────
const savingItemId = ref<string | null>(null)

async function onRecordCount(payload: { itemId: string; countedQty: number }): Promise<void> {
  if (!opname.value) {
    return
  }
  savingItemId.value = payload.itemId
  countError.value = null
  try {
    const updated = await stockOpnameService.recordCount(
      opname.value.id,
      payload.itemId,
      payload.countedQty,
    )
    opname.value = updated
  } catch (error) {
    countError.value = toMessage(error)
  } finally {
    savingItemId.value = null
  }
}

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<StockOpnameAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToList(): void {
  void router.push({ name: 'InventoryStockOpnames' })
}

function openAction(action: StockOpnameAction): void {
  activeAction.value = action
  actionError.value = null
}

function openAdjustment(adjustmentId: string): void {
  void router.push({ name: 'InventoryStockAdjustmentDetail', params: { id: adjustmentId } })
}

async function onConfirmAction(): Promise<void> {
  if (!opname.value || !activeAction.value) {
    return
  }
  const id = opname.value.id
  const action = activeAction.value
  actionSubmitting.value = true
  actionError.value = null
  try {
    let updated: StockOpname
    if (action === 'start') {
      updated = await stockOpnameService.start(id)
    } else if (action === 'submit') {
      updated = await stockOpnameService.submit(id)
    } else if (action === 'approve') {
      updated = await stockOpnameService.approve(id)
    } else if (action === 'complete') {
      updated = await stockOpnameService.complete(id)
    } else {
      updated = await stockOpnameService.cancel(id)
    }
    opname.value = updated
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
    <PageBreadcrumb :pageTitle="'Detail Stock Opname'" />

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

    <template v-else-if="opname">
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
          <h3 class="card-title">
            {{ opname.opnameNumber }}
          </h3>
        </div>

        <StockOpnameActionBar
          v-if="hasAnyAction"
          :show-start="showStart"
          :show-submit="showSubmit"
          :show-approve="showApprove"
          :show-complete="showComplete"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @start="openAction('start')"
          @submit="openAction('submit')"
          @approve="openAction('approve')"
          @complete="openAction('complete')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Stock Opname">
          <!-- Action error banner (mutation failures keep user here) -->
          <p v-if="actionError" class="alert-error mb-4 px-3 py-2">
            {{ actionError }}
          </p>

          <StockOpnameSummary
            :opname="opname"
            :outlet-name="outletName"
            @open-adjustment="openAdjustment"
          />

          <div class="mt-6">
            <!-- Per-row count error banner (record-count failures keep user here) -->
            <p v-if="countError" class="alert-error mb-4 px-3 py-2">
              {{ countError }}
            </p>

            <StockOpnameItemsTable
              :opname="opname"
              :product-name="productName"
              :batch-label="batchLabel"
              :editable="itemsEditable"
              :saving-item-id="savingItemId"
              @record-count="onRecordCount"
            />
          </div>

          <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada aksi untuk status ini.
          </p>
        </ComponentCard>
      </div>
    </template>

    <StockOpnameActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
