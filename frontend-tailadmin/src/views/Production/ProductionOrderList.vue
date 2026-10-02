<script setup lang="ts">
/**
 * ProductionOrderList — thin controller for the Production Orders list page.
 * List state (pagination/search/status + outlet filter) lives in
 * `useProductionOrders`; the toolbar and table are separate feature components.
 * Product and outlet names are resolved from one-time lookups. "Buat" and row
 * "detail" navigate to dedicated full pages (the schedule form is a page).
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import {
  ProductionOrderFilterBar,
  ProductionOrderTable,
} from '@/components/production/production-order'
import { usePermission } from '@/composables/usePermission'
import { useProductionOrders } from '@/composables/useProductionOrders'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'
import type { ProductionOrder } from '@/services/production-order.service'

const pageTitle = 'Production Orders'
const router = useRouter()
const { can } = usePermission()
const canCreate = computed<boolean>(() => can('production-order.manage'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  outletFilter,
  page,
  totalPages,
  canPrev,
  canNext,
  fetchList,
  prevPage,
  nextPage,
} = useProductionOrders()

// Resolve outlet + product names from one-time lookups. The outlet filter uses
// only the outlets the current user may access.
const outlets = ref<Outlet[]>([])
const outletNames = ref<Map<string, string>>(new Map())
const productNames = ref<Map<string, string>>(new Map())

async function loadLookups(): Promise<void> {
  try {
    const [accessibleOutlets, allProducts] = await Promise.all([
      outletService.getAccessible(),
      fetchAllPaginated((p) => productService.list({ page: p, limit: PAGE_LIMIT })),
    ])
    outlets.value = accessibleOutlets
    outletNames.value = new Map(accessibleOutlets.map((o) => [o.id, o.name]))
    productNames.value = new Map(allProducts.map((p) => [p.id, `${p.name} (${p.sku})`]))
  } catch {
    // Non-fatal: fall back to showing raw ids in the table.
    outlets.value = []
    outletNames.value = new Map()
    productNames.value = new Map()
  }
}

function outletName(id: string): string {
  return outletNames.value.get(id) ?? id
}
function productName(id: string): string {
  return productNames.value.get(id) ?? id
}

function goToCreate(): void {
  void router.push({ name: 'ProductionOrderCreate' })
}

function goToDetail(order: ProductionOrder): void {
  void router.push({ name: 'ProductionOrderDetail', params: { id: order.id } })
}

onMounted(() => {
  void loadLookups()
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Production Orders"
      desc="Perintah produksi instan: konversi bahan baku menjadi barang jadi melalui resep (BOM) dalam satu aksi."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ProductionOrderFilterBar
          v-model:search="search"
          v-model:outlet="outletFilter"
          :outlets="outlets"
        />
        <Button v-if="canCreate" size="sm" variant="primary" :on-click="goToCreate">
          + Produksi
        </Button>
      </div>

      <ProductionOrderTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :product-name="productName"
        :outlet-name="outletName"
        @view="goToDetail"
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
