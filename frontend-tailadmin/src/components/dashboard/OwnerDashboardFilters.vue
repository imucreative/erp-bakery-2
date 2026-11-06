<template>
  <div class="panel-card field-grid md:grid-cols-3">
    <div>
      <label for="dashboard-outlet-filter" class="form-label">Outlet</label>
      <BaseSelect
        id="dashboard-outlet-filter"
        :model-value="outletId"
        :options="outletOptions"
        :disabled="loading"
        @update:model-value="onOutletChange"
      />
    </div>
    <div>
      <label for="dashboard-period-filter" class="form-label">Periode</label>
      <BaseSelect
        id="dashboard-period-filter"
        :model-value="String(periodDays)"
        :options="periodOptions"
        :disabled="loading"
        @update:model-value="onPeriodChange"
      />
    </div>
    <div>
      <label for="dashboard-top-products-filter" class="form-label">Jumlah Produk</label>
      <BaseSelect
        id="dashboard-top-products-filter"
        :model-value="String(topProductsLimit)"
        :options="topProductsOptions"
        :disabled="loading"
        @update:model-value="onTopProductsChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import {
  OWNER_DASHBOARD_PERIOD_OPTIONS,
  OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS,
  type OwnerDashboardPeriodDays,
  type OwnerDashboardTopProductsLimit,
} from '@/services/dashboard.service'
import type { Outlet } from '@/services/outlet.service'

const props = defineProps<{
  outletId: string
  periodDays: OwnerDashboardPeriodDays
  topProductsLimit: OwnerDashboardTopProductsLimit
  outlets: Outlet[]
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:outletId': [value: string]
  'update:periodDays': [value: OwnerDashboardPeriodDays]
  'update:topProductsLimit': [value: OwnerDashboardTopProductsLimit]
}>()

const outletOptions = computed(() => [
  { label: 'Semua Outlet', value: '' },
  ...props.outlets.map((outlet) => ({ label: outlet.name, value: outlet.id })),
])

const periodOptions = OWNER_DASHBOARD_PERIOD_OPTIONS.map((days) => ({
  label: `${days} hari`,
  value: String(days),
}))

const topProductsOptions = OWNER_DASHBOARD_TOP_PRODUCTS_OPTIONS.map((limit) => ({
  label: String(limit),
  value: String(limit),
}))

function onOutletChange(value: string | number): void {
  emit('update:outletId', String(value))
}

function onPeriodChange(value: string | number): void {
  const days = Number(value)
  if (days === 7 || days === 14 || days === 30 || days === 90) {
    emit('update:periodDays', days)
  }
}

function onTopProductsChange(value: string | number): void {
  const limit = Number(value)
  if (limit === 5 || limit === 10 || limit === 20 || limit === 50) {
    emit('update:topProductsLimit', limit)
  }
}
</script>
