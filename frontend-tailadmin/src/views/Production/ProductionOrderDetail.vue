<script setup lang="ts">
/**
 * ProductionOrderDetail — full-page READ-ONLY view of a Production Order. Since
 * production is instant-complete, an order is always COMPLETED and final: there
 * are no lifecycle actions. The view shows the header summary (product, recipe,
 * outlet, target/success/waste, dates, notes), the consumed materials, and the
 * produced finished-goods batches.
 *
 * This view owns load state only; presentation is delegated to stateless feature
 * sub-components (summary, materials/results tables). Ids are resolved to names
 * via one-time lookups.
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChevronLeft } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import {
  ProductionOrderSummary,
  ProductionOrderMaterialsTable,
  ProductionOrderResultsTable,
} from '@/components/production/production-order'
import { toMessage } from '@/composables/useStockLedger'
import { outletService } from '@/services/outlet.service'
import { productService } from '@/services/product.service'
import { recipeService } from '@/services/recipe.service'
import { inventoryService } from '@/services/inventory.service'
import {
  productionOrderService,
  statusBadgeColor,
  PRODUCTION_ORDER_STATUS_LABELS,
  type ProductionOrder,
} from '@/services/production-order.service'
import { fetchAllPaginated, PAGE_LIMIT } from '@/lib/fetchAll'

const route = useRoute()
const router = useRouter()

const orderId = computed<string>(() => String(route.params.id))

const order = ref<ProductionOrder | null>(null)
const loading = ref<boolean>(true)
const loadError = ref<string | null>(null)

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

function goToList(): void {
  void router.push({ name: 'ProductionOrders' })
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
      <!-- Page header: back (icon-only) + number + status badge -->
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
        <Badge :color="statusBadgeColor(order.status)">
          {{ PRODUCTION_ORDER_STATUS_LABELS[order.status] }}
        </Badge>
      </div>

      <div class="grid grid-cols-1 gap-5">
        <ComponentCard title="Informasi Perintah Produksi">
          <ProductionOrderSummary
            :order="order"
            :product-name="productName"
            :outlet-name="outletName"
            :recipe-name="recipeName"
          />
        </ComponentCard>

        <ComponentCard title="Bahan Baku Dikonsumsi">
          <ProductionOrderMaterialsTable
            v-if="order.materials.length > 0"
            :materials="order.materials"
            :product-name="productName"
            :batch-label="batchLabel"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada bahan baku yang tercatat.
          </p>
        </ComponentCard>

        <ComponentCard title="Hasil Produksi (Batch Barang Jadi)">
          <ProductionOrderResultsTable
            v-if="order.results.length > 0"
            :results="order.results"
            :product-name="productName"
          />
          <p v-else class="py-6 text-center text-theme-sm text-gray-400 dark:text-gray-500">
            Tidak ada batch barang jadi (tidak ada hasil yang berhasil).
          </p>
        </ComponentCard>
      </div>
    </template>
  </AdminLayout>
</template>
