<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard" />

    <div class="space-y-6">
      <div class="panel-card grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label for="dashboard-outlet-filter" class="form-label">Outlet</label>
          <BaseSelect
            id="dashboard-outlet-filter"
            :model-value="selectedOutletId"
            :options="outletOptions"
            :disabled="loading"
            @update:model-value="onOutletChange"
          />
        </div>
        <div>
          <label for="dashboard-period-filter" class="form-label">Periode</label>
          <BaseSelect
            id="dashboard-period-filter"
            :model-value="String(selectedPeriodDays)"
            :options="periodOptions"
            :disabled="loading"
            @update:model-value="onPeriodChange"
          />
        </div>
        <div>
          <label for="dashboard-top-products-filter" class="form-label">Jumlah Produk</label>
          <BaseSelect
            id="dashboard-top-products-filter"
            :model-value="String(selectedTopProductsLimit)"
            :options="topProductsOptions"
            :disabled="loading"
            @update:model-value="onTopProductsLimitChange"
          />
        </div>
      </div>

      <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        title="Revenue Hari Ini"
        :value="summary?.revenueToday || 0"
        format="currency"
        :icon="DollarSign"
      />
      <KpiCard
        title="Transaksi Hari Ini"
        :value="summary?.salesToday || 0"
        format="number"
        :icon="ShoppingCart"
      />
      <KpiCard
        title="Stok Menipis"
        :value="summary?.lowStockCount || 0"
        format="number"
        :icon="AlertTriangle"
        trend-color="amber"
        clickable
        @click="$router.push('/inventory')"
      />
      <KpiCard
        title="Produk Kedaluwarsa"
        :value="summary?.expiredCount || 0"
        format="number"
        :icon="Clock"
        trend-color="red"
        clickable
        @click="$router.push('/inventory')"
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Sales Trend Chart -->
      <ComponentCard :title="`Tren Penjualan ${selectedPeriodDays} Hari`" desc="Revenue dan jumlah transaksi">
        <apexchart
          v-if="chartOptions"
          type="line"
          height="300"
          :options="chartOptions"
          :series="chartSeries"
        />
        <div v-else class="flex items-center justify-center h-[300px] text-gray-400">
          {{ loading ? 'Memuat data...' : 'Belum ada data penjualan' }}
        </div>
      </ComponentCard>

      <!-- Expiring Soon Table -->
      <ComponentCard title="Akan Kedaluwarsa" desc="Batch dengan expiry date ≤30 hari">
        <BaseTable
          v-if="summary?.expiringSoon && summary.expiringSoon.length > 0"
          :isEmpty="summary.expiringSoon.length === 0"
        >
          <template #header>
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Produk</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Batch</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Kedaluwarsa</th>
              <th class="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">Qty</th>
            </tr>
          </template>
          <template #body>
            <tr v-for="item in summary.expiringSoon" :key="item.productId + item.batchNo">
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{{ item.productName }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ item.batchNo }}</td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{{ formatDate(item.expiryDate) }}</td>
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90 text-right">{{ item.qty }} {{ item.uomName }}</td>
            </tr>
          </template>
        </BaseTable>
        <div v-else class="flex items-center justify-center h-[200px] text-gray-400">
          Tidak ada batch yang akan kedaluwarsa
        </div>
      </ComponentCard>
    </div>

    <!-- Top Products Table -->
    <ComponentCard
      :title="`Produk Terlaris ${selectedPeriodDays} Hari`"
      :desc="`Top ${selectedTopProductsLimit} produk dan kombinasi topping berdasarkan qty terjual`"
    >
      <BaseTable
        v-if="summary?.topProducts && summary.topProducts.length > 0"
        :isEmpty="summary.topProducts.length === 0"
      >
        <template #header>
          <tr>
            <th class="px-4 py-3 text-left text-sm font-semibold text-gray-800 dark:text-white/90">Produk</th>
            <th class="px-4 py-3 text-start text-sm font-semibold text-gray-800 dark:text-white/90">
              Topping
            </th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">Qty Terjual</th>
            <th class="px-4 py-3 text-right text-sm font-semibold text-gray-800 dark:text-white/90">Revenue</th>
          </tr>
        </template>
        <template #body>
          <tr
            v-for="item in summary.topProducts"
            :key="JSON.stringify([item.productId, item.productName, item.toppingNames])"
          >
            <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90">{{ item.productName }}</td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
              {{ item.toppingNames.length ? item.toppingNames.join(' + ') : 'Tanpa topping' }}
            </td>
            <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 text-right">{{ item.qtySold }}</td>
            <td class="px-4 py-3 text-sm text-gray-800 dark:text-white/90 text-right">{{ formatCurrency(item.revenue) }}</td>
          </tr>
        </template>
      </BaseTable>
      <div v-else class="flex items-center justify-center h-[200px] text-gray-400">
        Belum ada data penjualan
      </div>
    </ComponentCard>

    <!-- Loading Overlay -->
    <div
      v-if="loading"
      class="fixed inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center z-50"
    >
      <div class="text-gray-600 dark:text-gray-400">Memuat dashboard...</div>
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
import { useOwnerDashboard } from '@/composables/useDashboard'
import {
  OWNER_DASHBOARD_PERIOD_OPTIONS,
  OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS,
  type OwnerDashboardPeriodDays,
  type OwnerDashboardTopProductsLimit,
} from '@/services/dashboard.service'
import { outletService, type Outlet } from '@/services/outlet.service'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import BaseTable from '@/components/ui/BaseTable.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import { DollarSign, ShoppingCart, AlertTriangle, Clock } from 'lucide-vue-next'

const { summary, loading, errorMessage, load } = useOwnerDashboard()

const outlets = ref<Outlet[]>([])
const selectedOutletId = ref<string>('')
const selectedPeriodDays = ref<OwnerDashboardPeriodDays>(7)
const selectedTopProductsLimit = ref<OwnerDashboardTopProductsLimit>(10)

const outletOptions = computed(() => [
  { label: 'Semua Outlet', value: '' },
  ...outlets.value.map((outlet) => ({ label: outlet.name, value: outlet.id })),
])
const periodOptions = OWNER_DASHBOARD_PERIOD_OPTIONS.map((days) => ({
  label: `${days} hari`,
  value: String(days),
}))
const topProductsOptions = OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS.map((limit) => ({
  label: String(limit),
  value: String(limit),
}))

function reloadDashboard(): void {
  load({
    ...(selectedOutletId.value ? { outletId: selectedOutletId.value } : {}),
    periodDays: selectedPeriodDays.value,
    topProductsLimit: selectedTopProductsLimit.value,
  })
}

function onOutletChange(value: string): void {
  selectedOutletId.value = value
  reloadDashboard()
}

function onPeriodChange(value: string): void {
  const periodDays = Number(value)
  if (periodDays !== 7 && periodDays !== 14 && periodDays !== 30 && periodDays !== 90) return

  selectedPeriodDays.value = periodDays
  reloadDashboard()
}

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

  selectedTopProductsLimit.value = topProductsLimit
  reloadDashboard()
}

// Chart configuration
const chartOptions = computed(() => {
  if (!summary.value?.salesTrend || summary.value.salesTrend.length === 0) return null

  return {
    chart: {
      type: 'line',
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: {
      curve: 'smooth',
      width: [3, 2],
    },
    colors: ['#4F46E5', '#10B981'],
    xaxis: {
      categories: summary.value.salesTrend.map((p) =>
        new Date(p.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      ),
      labels: {
        style: { colors: '#6B7280' },
      },
    },
    yaxis: [
      {
        title: { text: 'Revenue (Rp)' },
        labels: {
          formatter: (val: number) => {
            if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`
            if (val >= 1000) return `${(val / 1000).toFixed(0)}K`
            return val.toFixed(0)
          },
          style: { colors: '#4F46E5' },
        },
      },
      {
        opposite: true,
        title: { text: 'Transaksi' },
        labels: {
          style: { colors: '#10B981' },
        },
      },
    ],
    grid: {
      borderColor: '#E5E7EB',
    },
    legend: {
      position: 'top',
    },
  }
})

const chartSeries = computed(() => {
  if (!summary.value?.salesTrend) return []

  return [
    {
      name: 'Revenue',
      data: summary.value.salesTrend.map((p) => p.revenue),
    },
    {
      name: 'Transaksi',
      data: summary.value.salesTrend.map((p) => p.orderCount),
    },
  ]
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

onMounted(async () => {
  reloadDashboard()
  outlets.value = await outletService.getAccessible()
})
</script>
