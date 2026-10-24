<script setup lang="ts">
/**
 * GoodsReceiptDetail — full-page read-only view of a Goods Receipt: header meta
 * (summary) + received line items, plus a vertical status timeline built from
 * `statusLogs`. Renders status- and permission-aware lifecycle actions:
 *
 *   DRAFT     → Edit (gr.update), Complete (gr.complete — posts inventory,
 *               confirmation modal warns it is final), Cancel (gr.update)
 *   COMPLETED → terminal (no actions; inventory already posted)
 *   CANCELLED → terminal (no actions)
 *
 * Complete/cancel go through a confirmation modal. Mutations keep the user on
 * the page; backend errors (409 invalid transition, 400 validation) surface in
 * the modal or an inline banner.
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
import { BaseAlert, BaseButton } from '@/components/ui'
import {
  GoodsReceiptSummary,
  GoodsReceiptItemsTable,
  GoodsReceiptActionBar,
  GoodsReceiptTimeline,
  GoodsReceiptActionModals,
  GoodsReceiptComments,
  GoodsReceiptAttachments,
  type GoodsReceiptAction,
} from '@/components/procurement/goods-receipt'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/usePurchaseRequests'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import { supplierService } from '@/services/supplier.service'
import { purchaseOrderService } from '@/services/purchase-order.service'
import { goodsReceiptService, type GoodsReceipt } from '@/services/goods-receipt.service'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const grId = computed<string>(() => String(route.params.id))

const gr = ref<GoodsReceipt | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())
const supplierNames = ref<Map<string, string>>(new Map())
const poNumbers = ref<Map<string, string>>(new Map())
// product id → its base-unit UOM id (for the UOM Conversion T2 stock hint).
const productBaseUomIds = ref<Map<string, string>>(new Map())

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
function poNumber(id: string): string {
  return poNumbers.value.get(id) ?? id
}
/**
 * Resolve a product's base-unit UOM name for the GR items table conversion
 * hint. Returns null when the base unit is unknown or identical to nothing
 * useful — the table then simply omits the hint.
 */
function baseUomName(productId: string): string | null {
  const baseUomId = productBaseUomIds.value.get(productId)
  if (!baseUomId) {
    return null
  }
  return uomNames.value.get(baseUomId) ?? null
}

// ── Permission + status → available actions ──────────────────────────
const canUpdate = computed<boolean>(() => can('procurement.gr.update'))
const canComplete = computed<boolean>(() => can('procurement.gr.complete'))

const status = computed<GoodsReceipt['status'] | null>(() => gr.value?.status ?? null)

const showEdit = computed<boolean>(() => canUpdate.value && status.value === 'DRAFT')
const showComplete = computed<boolean>(() => canComplete.value && status.value === 'DRAFT')
const showCancel = computed<boolean>(() => canUpdate.value && status.value === 'DRAFT')
const hasAnyAction = computed<boolean>(
  () => showEdit.value || showComplete.value || showCancel.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(): Promise<void> {
  const [allOutlets, allProducts, allUoms, allSuppliers, allOrders] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => uomService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => supplierService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => purchaseOrderService.list({ page, limit: PAGE_LIMIT })),
  ])
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  productBaseUomIds.value = new Map(allProducts.map((p) => [p.id, p.uomId]))
  uomNames.value = new Map(allUoms.map((u) => [u.id, u.name]))
  supplierNames.value = new Map(allSuppliers.map((s) => [s.id, s.name]))
  poNumbers.value = new Map(allOrders.map((po) => [po.id, po.poNumber]))
}

async function loadGr(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const [detail] = await Promise.all([goodsReceiptService.getById(grId.value), loadLookups()])
    gr.value = detail
  } catch (error) {
    loadError.value = toMessage(error)
    gr.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadGr()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<GoodsReceiptAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'GoodsReceiptEdit', params: { id: grId.value } })
}

function goToList(): void {
  void router.push({ name: 'GoodsReceipts' })
}

function openAction(action: GoodsReceiptAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(note: string): Promise<void> {
  if (!gr.value || !activeAction.value) {
    return
  }
  const id = gr.value.id
  actionSubmitting.value = true
  actionError.value = null
  try {
    if (activeAction.value === 'complete') {
      gr.value = await goodsReceiptService.complete(id, { note: note || undefined })
    } else if (activeAction.value === 'cancel') {
      gr.value = await goodsReceiptService.cancel(id, { note: note || undefined })
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
    <PageBreadcrumb :pageTitle="'Detail Goods Receipt'" />

    <div v-if="loading" class="panel-loading">Memuat data...</div>

    <BaseAlert v-else-if="loadError" :message="loadError" size="md" class="rounded-2xl py-4" />

    <template v-else-if="gr">
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
            {{ gr.grNumber }}
          </h3>
        </div>

        <GoodsReceiptActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-complete="showComplete"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @complete="openAction('complete')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <!-- Main column: summary + items -->
        <div class="space-y-5 lg:col-span-2">
          <ComponentCard title="Informasi Goods Receipt">
            <!-- Action error banner (mutation failures keep user here) -->
            <BaseAlert v-if="actionError" :message="actionError" size="sm" class="mb-4" />

            <GoodsReceiptSummary
              :gr="gr"
              :po-number="poNumber"
              :supplier-name="supplierName"
              :outlet-name="outletName"
            />

            <div class="mt-6">
              <GoodsReceiptItemsTable
                :gr="gr"
                :product-name="productName"
                :uom-name="uomName"
                :base-uom-name="baseUomName"
              />
            </div>

            <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
              Tidak ada aksi untuk status ini.
            </p>
          </ComponentCard>
        </div>

        <!-- Side column: status timeline -->
        <div class="space-y-5 lg:col-span-1">
          <ComponentCard title="Riwayat Status">
            <GoodsReceiptTimeline :logs="gr.statusLogs" />
          </ComponentCard>
          <ComponentCard title="Komentar">
            <GoodsReceiptComments :goods-receipt-id="gr.id" />
          </ComponentCard>
          <ComponentCard title="Lampiran">
            <GoodsReceiptAttachments :goods-receipt-id="gr.id" :can-manage="canUpdate" />
          </ComponentCard>
        </div>
      </div>
    </template>

    <GoodsReceiptActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
