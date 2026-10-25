<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard Outlet" />

    <div class="space-y-6">
      <!-- KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
    </div>

    <!-- Pending Requests (Placeholder) -->
    <ComponentCard title="Permintaan Pending" desc="Replenishment requests (coming soon)">
      <div class="flex items-center justify-center h-[150px] text-gray-400 dark:text-gray-500">
        <div class="text-center">
          <p class="text-4xl font-semibold mb-2">{{ summary?.pendingRequests || 0 }}</p>
          <p class="text-sm">Fitur replenishment belum tersedia</p>
        </div>
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
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useOutletDashboard } from '@/composables/useDashboard'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import KpiCard from '@/components/dashboard/KpiCard.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import { DollarSign, ShoppingCart, AlertTriangle } from 'lucide-vue-next'

const route = useRoute()
const outletId = route.params.outletId as string

const { summary, loading, errorMessage, load } = useOutletDashboard(outletId)

onMounted(() => {
  load()
})
</script>
