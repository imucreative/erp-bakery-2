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
import Button from '@/components/ui/Button.vue'
import {
  StockLedgerFilterBar,
  StockLedgerTable,
} from '@/components/inventory/stock-ledger'
import { useStockLedger } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'

const pageTitle = 'Stock Ledger'

const {
  items,
  meta,
  loading,
  errorMessage,
  outletId,
  productId,
  movementType,
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

// Lookup maps used by the table to resolve raw IDs → display names.
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, { name: string; sku: string }>>(new Map())

async function loadOutlets(): Promise<void> {
  try {
    const result = await outletService.list({ page: 1, limit: 100, isActive: 'true' })
    outlets.value = result.items.map((o) => ({ id: o.id, name: o.name }))
    outletNames.value = new Map(result.items.map((o) => [o.id, o.name]))
  } catch {
    // Non-fatal: dropdown falls back to "Semua Outlet"; table shows raw ids.
    outlets.value = []
    outletNames.value = new Map()
  }
}

async function loadProducts(): Promise<void> {
  try {
    const result = await productService.list({ page: 1, limit: 100 })
    products.value = result.items.map((p) => ({ id: p.id, name: p.name, sku: p.sku }))
    productNames.value = new Map(
      result.items.map((p) => [p.id, { name: p.name, sku: p.sku }]),
    )
  } catch {
    // Non-fatal: dropdown falls back to "Semua Produk"; table shows raw ids.
    products.value = []
    productNames.value = new Map()
  }
}

onMounted(() => {
  void loadOutlets()
  void loadProducts()
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StockLedgerFilterBar
          v-model:outlet-id="outletId"
          v-model:product-id="productId"
          v-model:movement-type="movementType"
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
  </AdminLayout>
</template>
