<script setup lang="ts">
/**
 * StockTransferDetail — full-page read-only view of a Stock Transfer: header
 * meta (summary) + line items. Renders status- and permission-aware lifecycle
 * actions (the backend lifecycle is mirrored here — actions outside the current
 * transition are never shown):
 *
 *   DRAFT      → Edit (.create), Submit (.create), Cancel (.create)
 *   SUBMITTED  → Dispatch (.dispatch), Cancel (.create)
 *   IN_TRANSIT → Receive (.receive — posts TRANSFER_IN; NO cancel)
 *   COMPLETED  → terminal (no actions)
 *   CANCELLED  → terminal (no actions)
 *
 * The backend lifecycle endpoints take no body, so each action is a plain
 * confirmation modal. Mutations keep the user on the page; backend errors
 * (400 invalid transition / insufficient stock) surface in the modal, keeping
 * the current state intact.
 *
 * The item detail from the backend is already rich (batchNumber, lotNumber,
 * expiredDate), so only product and outlet names are resolved via one-time
 * lookups. This view owns all state and handlers; presentation is delegated to
 * stateless feature sub-components (summary, items table, action bar, modals).
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton } from '@/components/ui'
import {
  StockTransferSummary,
  StockTransferItemsTable,
  StockTransferActionBar,
  StockTransferActionModals,
  type StockTransferAction,
} from '@/components/inventory/stock-transfer'
import { usePermission } from '@/composables/usePermission'
import { toMessage } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { stockTransferService, type StockTransfer } from '@/services/stock-transfer.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

const transferId = computed<string>(() => String(route.params.id))

const transfer = ref<StockTransfer | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)
const actionError = ref<string | null>(null)

// Lookup maps for resolving ids → names in the read-only view.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}

// ── Permission + status → available actions ──────────────────────────
const canCreate = computed<boolean>(() => can('inventory.transfer.create'))
const canDispatch = computed<boolean>(() => can('inventory.transfer.dispatch'))
const canReceive = computed<boolean>(() => can('inventory.transfer.receive'))

const status = computed<StockTransfer['status'] | null>(() => transfer.value?.status ?? null)

const showEdit = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showSubmit = computed<boolean>(() => canCreate.value && status.value === 'DRAFT')
const showDispatch = computed<boolean>(() => canDispatch.value && status.value === 'SUBMITTED')
const showReceive = computed<boolean>(() => canReceive.value && status.value === 'IN_TRANSIT')
const showCancel = computed<boolean>(
  () => canCreate.value && (status.value === 'DRAFT' || status.value === 'SUBMITTED'),
)
const hasAnyAction = computed<boolean>(
  () =>
    showEdit.value ||
    showSubmit.value ||
    showDispatch.value ||
    showReceive.value ||
    showCancel.value,
)

// ── Load ─────────────────────────────────────────────────────────────
async function loadLookups(): Promise<void> {
  const [allOutlets, allProducts] = await Promise.all([
    fetchAllPaginated((page) => outletService.list({ page, limit: PAGE_LIMIT })),
    fetchAllPaginated((page) => productService.list({ page, limit: PAGE_LIMIT })),
  ])
  outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
}

async function loadTransfer(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    const detail = await stockTransferService.getById(transferId.value)
    transfer.value = detail
    await loadLookups()
  } catch (error) {
    loadError.value = toMessage(error)
    transfer.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadTransfer()
})

// ── Lifecycle actions ────────────────────────────────────────────────
const activeAction = ref<StockTransferAction | null>(null)
const actionSubmitting = ref<boolean>(false)

function goToEdit(): void {
  void router.push({ name: 'InventoryStockTransferEdit', params: { id: transferId.value } })
}

function goToList(): void {
  void router.push({ name: 'InventoryStockTransfers' })
}

function openAction(action: StockTransferAction): void {
  activeAction.value = action
  actionError.value = null
}

async function onConfirmAction(): Promise<void> {
  if (!transfer.value || !activeAction.value) {
    return
  }
  const id = transfer.value.id
  const action = activeAction.value
  actionSubmitting.value = true
  actionError.value = null
  try {
    let updated: StockTransfer
    if (action === 'submit') {
      updated = await stockTransferService.submit(id)
    } else if (action === 'dispatch') {
      updated = await stockTransferService.dispatch(id)
    } else if (action === 'receive') {
      updated = await stockTransferService.receive(id)
    } else {
      updated = await stockTransferService.cancel(id)
    }
    transfer.value = updated
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
    <PageBreadcrumb :pageTitle="'Detail Transfer Stok'" />

    <div v-if="loading" class="panel-loading">Memuat data...</div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-error-500/40 bg-error-50 p-4 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ loadError }}
    </div>

    <template v-else-if="transfer">
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
            {{ transfer.transferNumber }}
          </h3>
        </div>

        <StockTransferActionBar
          v-if="hasAnyAction"
          :show-edit="showEdit"
          :show-submit="showSubmit"
          :show-dispatch="showDispatch"
          :show-receive="showReceive"
          :show-cancel="showCancel"
          :submitting="actionSubmitting"
          @edit="goToEdit"
          @submit="openAction('submit')"
          @dispatch="openAction('dispatch')"
          @receive="openAction('receive')"
          @cancel="openAction('cancel')"
        />
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Transfer Stok">
          <!-- Action error banner (mutation failures keep user here) -->
          <p v-if="actionError" class="alert-error mb-4 px-3 py-2">
            {{ actionError }}
          </p>

          <StockTransferSummary :transfer="transfer" :outlet-name="outletName" />

          <div class="mt-6">
            <StockTransferItemsTable :transfer="transfer" :product-name="productName" />
          </div>

          <p v-if="!hasAnyAction" class="mt-6 text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada aksi untuk status ini.
          </p>
        </ComponentCard>
      </div>
    </template>

    <StockTransferActionModals
      :action="activeAction"
      :submitting="actionSubmitting"
      :error-message="actionError"
      @close="activeAction = null"
      @confirm="onConfirmAction"
    />
  </AdminLayout>
</template>
