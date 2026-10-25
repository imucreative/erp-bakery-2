<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Inventory Report" />

    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Stock on hand per product dengan batch details
          </p>
        </div>
        <BaseButton
          variant="primary"
          :disabled="exporting"
          @click="exportReport"
        >
          {{ exporting ? 'Exporting...' : 'Export CSV' }}
        </BaseButton>
      </div>

    <!-- Filters -->
    <ComponentCard title="Filters">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BaseFormField label="Outlet" fieldId="outletId">
          <EntityCombobox
            :model-value="filters.outletId"
            :selected-label="outletSelectedLabel"
            :items="outletResults"
            :item-id="(o: Outlet) => o.id"
            :item-label="(o: Outlet) => o.name"
            :searching="outletSearching"
            searching-text="Mencari..."
            empty-text="Outlet tidak ditemukan."
            placeholder="All Outlets"
            aria-label="Pilih outlet"
            @update:model-value="filters.outletId = $event"
            @search="onOutletSearch"
            @select="onOutletSelect"
            @clear="onOutletClear"
          />
        </BaseFormField>

        <BaseFormField label="Product" fieldId="productId">
          <EntityCombobox
            :model-value="filters.productId"
            :selected-label="productSelectedLabel"
            :items="productResults"
            :item-id="(p: Product) => p.id"
            :item-label="(p: Product) => `${p.name} (${p.sku})`"
            :searching="productSearching"
            searching-text="Mencari..."
            empty-text="Produk tidak ditemukan."
            placeholder="All Products"
            aria-label="Pilih produk"
            @update:model-value="filters.productId = $event"
            @search="onProductSearch"
            @select="onProductSelect"
            @clear="onProductClear"
          />
        </BaseFormField>

        <BaseFormField label="Include Expired" fieldId="includeExpired">
          <ToggleSwitch
            id="includeExpired"
            v-model="filters.includeExpired"
            label="Show expired batches"
          />
        </BaseFormField>
      </div>

      <div class="mt-4 flex justify-end">
        <BaseButton variant="primary" :disabled="loading" @click="loadReport">
          {{ loading ? 'Loading...' : 'Apply Filters' }}
        </BaseButton>
      </div>
    </ComponentCard>

    <!-- Summary Cards -->
    <div v-if="report" class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <KpiCard
        title="Total Products"
        :value="report.summary.totalProducts"
        format="number"
      />
      <KpiCard
        title="Total Batches"
        :value="report.summary.totalBatches"
        format="number"
      />
      <KpiCard
        title="Stock Value"
        :value="report.summary.totalStockValue"
        format="currency"
      />
      <KpiCard
        title="Low Stock"
        :value="report.summary.lowStockCount"
        format="number"
        trend-color="amber"
      />
      <KpiCard
        title="Expired"
        :value="report.summary.expiredCount"
        format="number"
        trend-color="red"
      />
    </div>

    <!-- Product Details Table -->
    <ComponentCard v-if="report" title="Product Details" desc="Stock on hand per product">
      <BaseTable
        :is-empty="report.details.length === 0"
        empty-message="Tidak ada data produk."
        aria-label="Daftar produk inventory"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Product</BaseTableHead>
            <BaseTableHead>SKU</BaseTableHead>
            <BaseTableHead align="end">Total Qty</BaseTableHead>
            <BaseTableHead align="end">Available Qty</BaseTableHead>
            <BaseTableHead align="end">Batches</BaseTableHead>
            <BaseTableHead>Earliest Expiry</BaseTableHead>
            <BaseTableHead align="end">Stock Value</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow v-for="row in report.details" :key="row.productId">
            <BaseTableCell>
              <span class="text-strong">{{ row.productName }}</span>
            </BaseTableCell>
            <BaseTableCell>
              <span class="text-meta">{{ row.sku }}</span>
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ row.totalQty.toFixed(2) }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.availableQty.toFixed(2) }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.batchCount }}
            </BaseTableCell>
            <BaseTableCell>
              {{ row.earliestExpiry ? formatDate(row.earliestExpiry) : 'N/A' }}
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ formatCurrency(row.stockValue) }}
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>
    </ComponentCard>

    <!-- Empty State -->
    <div v-if="!report && !loading" class="text-center py-12 text-gray-400">
      Apply filters to load inventory report
    </div>

    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="fixed inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-50"
    >
      <div class="text-gray-600 dark:text-gray-400">Loading report...</div>
    </div>

    <!-- Error Alert -->
    <BaseAlert
      v-if="errorMessage"
      type="error"
      :message="errorMessage"
      class="mt-4"
    />
  </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useInventoryReport } from '@/composables/useReports'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { BaseTable, BaseTableRow, BaseTableHead, BaseTableCell } from '@/components/ui'
import BaseButton from '@/components/ui/BaseButton.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import BaseFormField from '@/components/ui/BaseFormField.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'

const SEARCH_DEBOUNCE_MS = 300

const { report, filters, loading, exporting, errorMessage, loadReport, exportReport } =
  useInventoryReport()

// ── Outlet autocomplete (server-side) ────────────────────────────────
const outletResults = ref<Outlet[]>([])
const outletSearching = ref<boolean>(false)
const outletSelectedLabel = ref<string>('')
let outletSearchTimer: ReturnType<typeof setTimeout> | undefined

function onOutletSearch(query: string): void {
  if (outletSearchTimer) {
    clearTimeout(outletSearchTimer)
  }
  if (query.length === 0) {
    outletResults.value = []
    outletSearching.value = false
    return
  }
  outletSearching.value = true
  outletSearchTimer = setTimeout(async () => {
    try {
      const result = await outletService.list({ page: 1, limit: 50, search: query })
      outletResults.value = result.items
    } catch {
      outletResults.value = []
    } finally {
      outletSearching.value = false
    }
  }, SEARCH_DEBOUNCE_MS)
}

function onOutletSelect(outlet: Outlet): void {
  outletSelectedLabel.value = outlet.name
  outletResults.value = []
}

function onOutletClear(): void {
  outletSelectedLabel.value = ''
  outletResults.value = []
}

// ── Product autocomplete (server-side) ───────────────────────────────
const productResults = ref<Product[]>([])
const productSearching = ref<boolean>(false)
const productSelectedLabel = ref<string>('')
let productSearchTimer: ReturnType<typeof setTimeout> | undefined

function onProductSearch(query: string): void {
  if (productSearchTimer) {
    clearTimeout(productSearchTimer)
  }
  if (query.length === 0) {
    productResults.value = []
    productSearching.value = false
    return
  }
  productSearching.value = true
  productSearchTimer = setTimeout(async () => {
    try {
      const result = await productService.list({ page: 1, limit: 50, search: query })
      productResults.value = result.items
    } catch {
      productResults.value = []
    } finally {
      productSearching.value = false
    }
  }, SEARCH_DEBOUNCE_MS)
}

function onProductSelect(product: Product): void {
  productSelectedLabel.value = `${product.name} (${product.sku})`
  productResults.value = []
}

function onProductClear(): void {
  productSelectedLabel.value = ''
  productResults.value = []
}

// Formatters
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

onMounted(() => {
  loadReport()
})
</script>
