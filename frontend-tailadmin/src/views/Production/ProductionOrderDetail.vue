<script setup lang="ts">
/**
 * ProductionOrderDetail — full-page read-only view of a Production Order:
 * header meta (summary) + consumed materials + produced results (both populated
 * only once COMPLETED). Renders status- and permission-aware lifecycle actions
 * (canTransition is mirrored from the backend — actions outside the current
 * transition are never shown). Every write action requires production-order.manage:
 *
 *   SCHEDULED       → Start (start modal), Cancel (cancel modal)
 *   IN_PROGRESS     → Record Yield (yield modal)
 *   YIELD_COMPLETED → QA Check (QA modal: Lulus/Gagal + qaNotes)
 *   QA_PASSED       → Complete (complete modal — backflushing)
 *   QA_FAILED       → Complete (complete modal — output scrapped)
 *   COMPLETED       → terminal (no actions)
 *   CANCELLED       → terminal (no actions)
 *
 * Yield / QA / Cancel collect a small input set in the modal; Start / Complete
 * are plain confirmations. Mutations keep the user on the page; backend errors
 * (409 invalid transition, 400 insufficient ingredient stock on complete)
 * surface in the modal, keeping the current state intact.
 *
 * The entity exposes no status-log collection, so there is no timeline section.
 * This view owns all state and handlers; presentation is delegated to stateless
 * feature sub-components (summary, materials/results tables, action bar, modals).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import {
  ProductionOrderSummary,
  ProductionOrderMaterialsTable,
  ProductionOrderResultsTable,
  ProductionOrderActionBar,
  ProductionOrderActionModals,
  type ProductionOrderAction,
} from '@/components/production/production-order'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { recipeService } from '@/services/recipe.service'
import { inventoryService } from '@/services/inventory.service'
import {
  productionOrderService,
  type ProductionOrder,
  type QaCheckPayload,
  type RecordYieldPayload,
} from '@/services/production-order.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const orderId = computed<string>(() => String(route.params.id))

const order = ref<ProductionOrder | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const recipeNames = ref<Map<string, string>>(new Map())
const batchNumbers = ref<Map<string, string>>(new Map())

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}
function recipeName(id: string): string {
  return recipeNames.value.get(id) ?? id
}
function batchLabel(id: string): string {
  return batchNumbers.value.get(id) ?? id
}

// ── Permission + status → available actions (mirror canTransition) ───
const canManage = computed<boolean>(() => can('production-order.manage'))
const status = computed<ProductionOrder['status'] | null>(() => order.value?.status ?? null)

const showStart = computed<boolean>(() => canManage.value && status.value === 'SCHEDULED')
const showCancel = computed<boolean>(() => canManage.value && status.value === 'SCHEDULED')
const showYield = computed<boolean>(() => canManage.value && status.value === 'IN_PROGRESS')
const showQa = computed<boolean>(() => canManage.value && status.value === 'YIELD_COMPLETED')
const showComplete = computed<boolean>(
  () => canManage.value && (status.value === 'QA_PASSED' || status.value === 'QA_FAILED'),
)
const hasAnyAction = computed<boolean>(
  () =>
    showStart.value ||
    showCancel.value ||
    showYield.value ||
    showQa.value ||
    showComplete.value,
)

const isCompleted = computed<boolean>(() => status.value === 'COMPLETED')

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(outletId: string): Promise<void> {
  const [allOutlets, allProducts, allRecipes, allBatches] = await Promise.all([
    fetchAllPaginated((p) => outletService.list({ page: p, limit: PAGE_LIMIT })),
    fetchAllPaginated((p) => productService.list({ page: p, limit: PAGE_LIMIT })),
    fetchAllPaginated((p) => recipeService.list({ page: p, limit: PAGE_LIMIT })),
    // Batches of the order's outlet (include non-batch to resolve any id).
    fetchAllPaginated((p) =>
      inventoryService.getBatches({ page: p, limit: PAGE_LIMIT, outletId, includeNonBatch: true }),
    ),
  ])
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  recipeNames.value = new Map(allRecipes.map((r) => [r.id, `${r.name} (${r.recipeNumber})`]))
  batchNumbers.value = new Map(
    allBatches.map((entry) => [entry.batch.id, entry.batch.batchNumber || '(tanpa batch)']),
  )
}

async function loadOrder(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const detail = await productionOrderService.getById(orderId.value)
    order.value = detail
    await loadLookups(detail.outletId)
  } catch (error) {
    loadError.value = toMessage(error)
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadOrder()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<ProductionOrderAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToList(): void {
  void router.push({ name: 'ProductionOrders' })
}

function openAction(action: ProductionOrderAction): void {
  activeAction.value = action
  actionError.value = null
}

function closeAction(): void {
  activeAction.value = null
}

// Plain-confirmation actions (start / complete — no body).
async function onConfirmAction(): Promise<void> {
  if (!order.value || !activeAction.value) {
    return
  }
  const id = order.value.id
  const action = activeAction.value
  actionSubmitting.value = true
  actionError.value = null
  try {
    let updated: ProductionOrder
    if (action === 'start') {
      updated = await productionOrderService.start(id)
    } else if (action === 'complete') {
      updated = await productionOrderService.complete(id)
    } else {
      return
    }
    order.value = updated
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

async function onYield(payload: RecordYieldPayload): Promise<void> {
  if (!order.value) {
    return
  }
  actionSubmitting.value = true
  actionError.value = null
  try {
    order.value = await productionOrderService.recordYield(order.value.id, payload)
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

async function onQa(payload: QaCheckPayload): Promise<void> {
  if (!order.value) {
    return
  }
  actionSubmitting.value = true
  actionError.value = null
  try {
    order.value = await productionOrderService.qaCheck(order.value.id, payload)
    activeAction.value = null
  } catch (error) {
    actionError.value = toMessage(error)
  } finally {
    actionSubmitting.value = false
  }
}

async function onCancel(payload: { reason?: string }): Promise<void> {
  if (!order.value) {
    return
  }
  actionSubmitting.value = true
  actionError.value = null
  try {
    order.value = await productionOrderService.cancel(order.value.id, payload.reason)
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
    <PageBreadcrumb :pageTitle="'Detail Production Order'" />

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

    <template v-else-if="order">
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
            {{ order.productionNumber }}
          </h3>
        </div>

        <ProductionOrderActionBar
          v-if="hasAnyAction"
          :show-start="showStart"
          :show-yield="showYield"
          :show-qa="showQa"
          :show-complete="showComplete"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @start="openAction('start')"
          @yield="openAction('yield')"
          @qa="openAction('qa')"
          @complete="openAction('complete')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Perintah Produksi">
          <!-- Action error banner (mutation failures keep user here) -->
          <p
            v-if="actionError && !activeAction"
            class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
          >
            {{ actionError }}
          </p>

          <ProductionOrderSummary
            :order="order"
            :product-name="productName"
            :outlet-name="outletName"
            :recipe-name="recipeName"
          />

          <p
            v-if="!hasAnyAction"
            class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500"
          >
            Tidak ada aksi untuk status ini.
          </p>
        </ComponentCard>

        <!-- Materials & results appear only after completion -->
        <ComponentCard title="Bahan Baku Dikonsumsi">
          <ProductionOrderMaterialsTable
            v-if="isCompleted && order.materials.length > 0"
            :materials="order.materials"
            :product-name="productName"
            :batch-label="batchLabel"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Bahan baku ditampilkan setelah produksi diselesaikan.
          </p>
        </ComponentCard>

        <ComponentCard title="Hasil Produksi (Batch Barang Jadi)">
          <ProductionOrderResultsTable
            v-if="isCompleted && order.results.length > 0"
            :results="order.results"
            :product-name="productName"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Batch barang jadi ditampilkan setelah produksi diselesaikan dengan QA lulus.
          </p>
        </ComponentCard>
      </div>
    </template>

    <ProductionOrderActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="closeAction"
      @confirm="onConfirmAction"
      @yield="onYield"
      @qa="onQa"
      @cancel="onCancel"
    />
  </AdminLayout>
</template>
