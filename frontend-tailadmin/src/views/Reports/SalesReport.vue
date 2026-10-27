<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Sales Report" />

    <div class="space-y-6">
      <!-- Page Header -->
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Analisis penjualan dengan filter date range dan outlet
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
      <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
        <BaseFormField label="From" fieldId="dateFrom" :error="dateFromError">
          <BaseInput
            id="dateFrom"
            v-model="filters.dateFrom"
            type="date"
            :error="dateFromError || undefined"
          />
        </BaseFormField>

        <BaseFormField label="To" fieldId="dateTo" :error="dateToError">
          <BaseInput
            id="dateTo"
            v-model="filters.dateTo"
            type="date"
            :error="dateToError || undefined"
          />
        </BaseFormField>

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

        <BaseFormField label="Status" fieldId="status">
          <BaseSelect
            id="status"
            v-model="filters.status"
            :options="[
              { label: 'Paid', value: 'PAID' },
              { label: 'Refunded', value: 'REFUNDED' },
              { label: 'Cancelled', value: 'CANCELLED' },
            ]"
          />
        </BaseFormField>

        <BaseFormField label="Jumlah Produk" fieldId="topProductsLimit">
          <BaseSelect
            id="topProductsLimit"
            :model-value="String(filters.topProductsLimit)"
            :options="topProductsLimitOptions"
            @update:model-value="onTopProductsLimitChange"
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
    <div v-if="report" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <KpiCard
        title="Total Orders"
        :value="report.summary.totalOrders"
        format="number"
      />
      <KpiCard
        title="Total Revenue"
        :value="report.summary.totalRevenue"
        format="currency"
      />
      <KpiCard
        title="Avg Order Value"
        :value="report.summary.averageOrderValue"
        format="currency"
      />
      <KpiCard
        title="Items Sold"
        :value="report.summary.totalItemsSold"
        format="number"
      />
    </div>

    <!-- Daily Breakdown Table -->
    <ComponentCard v-if="report" title="Daily Breakdown" desc="Sales per day per outlet">
      <BaseTable
        :is-empty="report.details.length === 0"
        empty-message="Tidak ada data penjualan."
        aria-label="Daftar penjualan harian"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Date</BaseTableHead>
            <BaseTableHead>Outlet</BaseTableHead>
            <BaseTableHead align="end">Orders</BaseTableHead>
            <BaseTableHead align="end">Revenue</BaseTableHead>
            <BaseTableHead align="end">Items Sold</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow v-for="row in report.details" :key="`${row.date}-${row.outletId}`">
            <BaseTableCell>
              {{ formatDate(row.date) }}
            </BaseTableCell>
            <BaseTableCell>
              {{ row.outletName }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.orderCount }}
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ formatCurrency(row.revenue) }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.itemsSold }}
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>
    </ComponentCard>

    <!-- Top Products Table -->
    <ComponentCard
      v-if="report"
      title="Top Selling Products"
      :desc="`Top ${appliedTopProductsLimit} products and topping combinations by qty sold`"
    >
      <BaseTable
        :is-empty="report.topProducts.length === 0"
        empty-message="Tidak ada data produk."
        aria-label="Daftar produk terlaris"
      >
        <template #header>
          <BaseTableRow variant="header">
            <BaseTableHead>Product</BaseTableHead>
            <BaseTableHead>Topping</BaseTableHead>
            <BaseTableHead align="end">Qty Sold</BaseTableHead>
            <BaseTableHead align="end">Revenue</BaseTableHead>
          </BaseTableRow>
        </template>
        <template #body>
          <BaseTableRow
            v-for="row in report.topProducts"
            :key="JSON.stringify([row.productId, row.productName, row.toppingNames])"
          >
            <BaseTableCell>
              <span class="text-strong">{{ row.productName }}</span>
            </BaseTableCell>
            <BaseTableCell>
              {{ row.toppingNames.length ? row.toppingNames.join(' + ') : 'Tanpa topping' }}
            </BaseTableCell>
            <BaseTableCell align="end">
              {{ row.qtySold }}
            </BaseTableCell>
            <BaseTableCell align="end" emphasis="medium">
              {{ formatCurrency(row.revenue) }}
            </BaseTableCell>
          </BaseTableRow>
        </template>
      </BaseTable>
    </ComponentCard>

    <!-- Empty State -->
    <div v-if="!report && !loading" class="text-center py-12 text-gray-400">
      Apply filters to load sales report
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
import { computed, onMounted, ref } from 'vue'
import { useSalesReport } from '@/composables/useReports'
import { outletService, type Outlet } from '@/services/outlet.service'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import { BaseTable, BaseTableRow, BaseTableHead, BaseTableCell } from '@/components/ui'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseFormField from '@/components/ui/BaseFormField.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'

const OUTLET_SEARCH_DEBOUNCE_MS = 300

const {
  report,
  filters,
  appliedTopProductsLimit,
  loading,
  exporting,
  errorMessage,
  loadReport,
  exportReport,
} = useSalesReport()

const topProductsLimitOptions = [5, 10, 20, 50].map((limit) => ({
  label: String(limit),
  value: String(limit),
}))

function onTopProductsLimitChange(value: string): void {
  const topProductsLimit = Number(value)
  if (
    topProductsLimit !== 5 &&
    topProductsLimit !== 10 &&
    topProductsLimit !== 20 &&
    topProductsLimit !== 50
  ) {
    return
  }

  filters.value.topProductsLimit = topProductsLimit
}

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
      const result = await outletService.list({
        page: 1,
        limit: 50,
        search: query,
      })
      outletResults.value = result.items
    } catch {
      outletResults.value = []
    } finally {
      outletSearching.value = false
    }
  }, OUTLET_SEARCH_DEBOUNCE_MS)
}

function onOutletSelect(outlet: Outlet): void {
  outletSelectedLabel.value = outlet.name
  outletResults.value = []
}

function onOutletClear(): void {
  outletSelectedLabel.value = ''
  outletResults.value = []
}

// Validation
const dateFromError = computed(() => {
  if (!filters.value.dateFrom) return 'Date required'
  return null
})

const dateToError = computed(() => {
  if (!filters.value.dateTo) return 'Date required'
  if (filters.value.dateTo < filters.value.dateFrom) return 'End date must be after start date'
  return null
})

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
