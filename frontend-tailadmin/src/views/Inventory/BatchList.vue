<script setup lang="ts">
/**
 * BatchList — thin controller for the read-only Batch & Expiry list page.
 * List state (pagination / outlet / product / status filters + include-non-batch
 * toggle) lives in `useBatches`; the toolbar, table, and detail modal are
 * separate feature components. The batches endpoint returns raw InventoryBatch
 * rows carrying IDs only, so outlet and product names are resolved from
 * one-time lookup maps (same pattern as the Stock Ledger list). Expiry
 * classification is backend-derived — never recomputed here. Read-only: no
 * create button, no mutations; the only row action opens a read-only detail
 * modal fetched via the service.
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  BatchFilterBar,
  BatchTable,
  BatchDetailModal,
} from '@/components/inventory/batches'
import { useBatches, toMessage } from '@/composables/useBatches'
import { inventoryService, type BatchWithExpiry } from '@/services/inventory.service'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const pageTitle = 'Batch & Expiry'

const {
  items,
  meta,
  loading,
  errorMessage,
  outletId,
  productId,
  status,
  includeNonBatch,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useBatches()

interface OutletOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

// Options for the filter dropdowns, resolved once.
const outlets = ref<OutletOption[]>([])
const products = ref<ProductOption[]>([])

// Lookup maps used by the table/modal to resolve raw IDs → display values.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, { name: string; sku: string }>>(new Map())
// productId → base UOM label (UOM has no code field, so the name is used),
// resolved once by joining product→uomId with uomId→name. No N+1: both masters
// are fetched once via fetchAllPaginated.
const productUomLabels = ref<Map<string, string>>(new Map())
const productUomIds = ref<Map<string, string>>(new Map())
const uomNames = ref<Map<string, string>>(new Map())

async function loadOutlets(): Promise<void> {
  try {
    const allOutlets = await fetchAllPaginated((page) =>
      outletService.list({ page, limit: PAGE_LIMIT, isActive: 'true' }),
    )
    outlets.value = allOutlets.map((o) => ({ id: o.id, name: o.name }))
    outletNames.value = new Map(allOutlets.map((o) => [o.id, o.name]))
  } catch {
    // Non-fatal: dropdown falls back to "Semua Outlet"; table shows raw ids.
    outlets.value = []
    outletNames.value = new Map()
  }
}

async function loadProducts(): Promise<void> {
  try {
    const allProducts = await fetchAllPaginated((page) =>
      productService.list({ page, limit: PAGE_LIMIT }),
    )
    products.value = allProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))
    productNames.value = new Map(
      allProducts.map((p) => [p.id, { name: p.name, sku: p.sku }]),
    )
    productUomIds.value = new Map(allProducts.map((p) => [p.id, p.uomId]))
  } catch {
    // Non-fatal: dropdown falls back to "Semua Produk"; table shows raw ids.
    products.value = []
    productNames.value = new Map()
    productUomIds.value = new Map()
  }
  rebuildProductUomLabels()
}

// Fetch all UOMs once and build the uomId → name map used to resolve units.
async function loadUoms(): Promise<void> {
  try {
    const allUoms = await fetchAllPaginated((page) =>
      uomService.list({ page, limit: PAGE_LIMIT }),
    )
    uomNames.value = new Map(allUoms.map((u) => [u.id, u.name]))
  } catch {
    // Non-fatal: quantities simply render without a unit.
    uomNames.value = new Map()
  }
  rebuildProductUomLabels()
}

/** Join product→uomId with uomId→name into a single productId → unit map. */
function rebuildProductUomLabels(): void {
  const labels = new Map<string, string>()
  for (const [productId, uomId] of productUomIds.value) {
    const name = uomNames.value.get(uomId)
    if (name) {
      labels.set(productId, name)
    }
  }
  productUomLabels.value = labels
}

// Detail modal state.
const detailOpen = ref<boolean>(false)
const detail = ref<BatchWithExpiry | null>(null)
const detailLoading = ref<boolean>(false)
const detailError = ref<string | null>(null)

async function openDetail(id: string): Promise<void> {
  detailOpen.value = true
  detail.value = null
  detailError.value = null
  detailLoading.value = true
  try {
    detail.value = await inventoryService.getBatchById(id)
  } catch (error) {
    detailError.value = toMessage(error)
  } finally {
    detailLoading.value = false
  }
}

function closeDetail(): void {
  detailOpen.value = false
  detail.value = null
  detailError.value = null
}

onMounted(() => {
  void loadOutlets()
  void loadProducts()
  void loadUoms()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Batch & Expiry"
      desc="Pemantauan batch inventaris beserta status kedaluwarsanya per produk dan outlet."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BatchFilterBar
          v-model:outlet-id="outletId"
          v-model:product-id="productId"
          v-model:status="status"
          v-model:include-non-batch="includeNonBatch"
          :outlets="outlets"
          :products="products"
        />
      </div>

      <BatchTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-names="outletNames"
        :product-names="productNames"
        :product-uom-labels="productUomLabels"
        @view="openDetail"
      />

      <!-- Pagination -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row"
      >
        <span class="text-theme-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ items.length }} dari {{ meta.total }} data
        </span>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :disabled="!canPrev" :on-click="prevPage">
            Sebelumnya
          </Button>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <Button size="sm" variant="outline" :disabled="!canNext" :on-click="nextPage">
            Berikutnya
          </Button>
        </div>
      </div>
    </ComponentCard>

    <BatchDetailModal
      :open="detailOpen"
      :detail="detail"
      :loading="detailLoading"
      :error-message="detailError"
      :outlet-names="outletNames"
      :product-names="productNames"
      :product-uom-labels="productUomLabels"
      @close="closeDetail"
    />
  </AdminLayout>
</template>
