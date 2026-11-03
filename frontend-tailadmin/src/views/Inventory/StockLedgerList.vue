<script setup lang="ts">
/**
 * StockLedgerList — thin controller for the read-only Stock Ledger list page.
 * List state (pagination / outlet / product / movement-type filters) lives in
 * `useStockLedger`; the toolbar and table are separate feature components. The
 * ledger endpoint returns raw InventoryMovement rows carrying IDs only, so
 * outlet and product names are resolved from one-time lookup maps (same pattern
 * as the PR list). Read-only: no create button, no row actions.
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseTablePagination } from '@/components/ui'
import { StockLedgerFilterBar, StockLedgerTable } from '@/components/inventory/stock-ledger'
import { useStockLedger } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { uomService } from '@/services/uom.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const pageTitle = 'Stock Ledger'

const {
  items,
  meta,
  loading,
  errorMessage,
  outletId,
  productId,
  movementType,
  dateFrom,
  dateTo,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useStockLedger()

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

// Lookup maps used by the table to resolve raw IDs → display values.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, { name: string; sku: string }>>(new Map())
// productId → base UOM label (code preferred, else name), resolved once by
// joining the product→uomId map with the uomId→name map. Avoids any N+1: both
// masters are fetched once via fetchAllPaginated.
const productUomLabels = ref<Map<string, string>>(new Map())

// uomId → short display label, built once. UOM has no code field in the API,
// so the label is the UOM name.
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

// Fetch all UOMs once and build the uomId → name map used to resolve units.
async function loadUoms(): Promise<void> {
  try {
    const allUoms = await fetchAllPaginated((page) => uomService.list({ page, limit: PAGE_LIMIT }))
    uomNames.value = new Map(allUoms.map((u) => [u.id, u.name]))
  } catch {
    // Non-fatal: the ledger simply shows quantities without a unit.
    uomNames.value = new Map()
  }
  rebuildProductUomLabels()
}

async function loadProducts(): Promise<void> {
  try {
    const allProducts = await fetchAllPaginated((page) =>
      productService.list({ page, limit: PAGE_LIMIT }),
    )
    products.value = allProducts.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))
    productNames.value = new Map(allProducts.map((p) => [p.id, { name: p.name, sku: p.sku }]))
    // Keep the raw product→uom pairing so the label map can be rebuilt once the
    // UOM names arrive (whichever fetch finishes last wins).
    productUomIds.value = new Map(allProducts.map((p) => [p.id, p.uomId]))
  } catch {
    // Non-fatal: dropdown falls back to "Semua Produk"; table shows raw ids.
    products.value = []
    productNames.value = new Map()
    productUomIds.value = new Map()
  }
  rebuildProductUomLabels()
}

// productId → uomId, captured during the product fetch.
const productUomIds = ref<Map<string, string>>(new Map())

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
      title="Stock Ledger"
      desc="Riwayat pergerakan stok (inventory movement) per produk dan outlet."
    >
      <!-- Toolbar -->
      <div class="toolbar-row">
        <StockLedgerFilterBar
          v-model:outlet-id="outletId"
          v-model:product-id="productId"
          v-model:movement-type="movementType"
          v-model:date-from="dateFrom"
          v-model:date-to="dateTo"
          :outlets="outlets"
          :products="products"
        />
      </div>

      <StockLedgerTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :outlet-names="outletNames"
        :product-names="productNames"
        :product-uom-labels="productUomLabels"
      />

      <!-- Pagination -->
      <BaseTablePagination
        v-if="!loading && !errorMessage && items.length > 0"
        :current-count="items.length"
        :total-items="meta.total"
        :current-page="page"
        :total-pages="totalPages"
        :has-previous="canPrev"
        :has-next="canNext"
        @previous="prevPage"
        @next="nextPage"
      />
    </ComponentCard>
  </AdminLayout>
</template>
