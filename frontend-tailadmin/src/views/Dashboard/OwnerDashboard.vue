<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Dashboard" />

    <div class="space-y-6">
      <OwnerDashboardFilters
        v-model:outletId="selectedOutletId"
        v-model:periodDays="selectedPeriodDays"
        v-model:topProductsLimit="selectedTopProductsLimit"
        :outlets="outlets"
        :loading="loading"
      />

      <OwnerDashboardKpiGrid
        :summary="summary"
        @open-low-stock="goToInventory"
        @open-expired="goToProdukKadaluarsa"
      />

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SalesTrendChart
          :trend="summary?.salesTrend ?? []"
          :period-days="selectedPeriodDays"
          :loading="loading"
        />
        <ExpiringSoonTable :items="summary?.expiringSoon ?? []" />
      </div>

      <TopProductsTable
        :items="summary?.topProducts ?? []"
        :period-days="selectedPeriodDays"
        :top-products-limit="selectedTopProductsLimit"
      />

      <div v-if="loading" class="page-loading-overlay">
        <div class="text-muted">Memuat dashboard...</div>
      </div>

      <BaseAlert v-if="errorMessage" type="error" :message="errorMessage" class="mt-4" />
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useOwnerDashboard } from '@/composables/useDashboard'
import {
  type OwnerDashboardPeriodDays,
  type OwnerDashboardTopProductsLimit,
} from '@/services/dashboard.service'
import { outletService, type Outlet } from '@/services/outlet.service'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import BaseAlert from '@/components/ui/BaseAlert.vue'
import OwnerDashboardFilters from '@/components/dashboard/OwnerDashboardFilters.vue'
import OwnerDashboardKpiGrid from '@/components/dashboard/OwnerDashboardKpiGrid.vue'
import SalesTrendChart from '@/components/dashboard/SalesTrendChart.vue'
import ExpiringSoonTable from '@/components/dashboard/ExpiringSoonTable.vue'
import TopProductsTable from '@/components/dashboard/TopProductsTable.vue'

const router = useRouter()
const { summary, loading, errorMessage, load } = useOwnerDashboard()

const outlets = ref<Outlet[]>([])
const selectedOutletId = ref<string>('')
const selectedPeriodDays = ref<OwnerDashboardPeriodDays>(7)
const selectedTopProductsLimit = ref<OwnerDashboardTopProductsLimit>(10)

function goToInventory(): void {
  void router.push('/inventory/stock-on-hand')
}

function goToProdukKadaluarsa(): void {
  void router.push('/inventory/batches')
}

function reloadDashboard(): void {
  load({
    ...(selectedOutletId.value ? { outletId: selectedOutletId.value } : {}),
    periodDays: selectedPeriodDays.value,
    topProductsLimit: selectedTopProductsLimit.value,
  })
}

// Filters always reload the dashboard when they change.
watch([selectedOutletId, selectedPeriodDays, selectedTopProductsLimit], reloadDashboard)

onMounted(async () => {
  reloadDashboard()
  outlets.value = await outletService.getAccessible()
})
</script>
