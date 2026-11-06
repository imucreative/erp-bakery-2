<template>
  <ComponentCard
    :title="`Tren Penjualan ${periodDays} Hari`"
    desc="Revenue dan jumlah transaksi"
  >
    <apexchart
      v-if="hasData"
      type="line"
      height="300"
      :options="chartOptions"
      :series="chartSeries"
    />
    <div v-else class="panel-placeholder h-[300px]">
      {{ loading ? 'Memuat data...' : 'Belum ada data penjualan' }}
    </div>
  </ComponentCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import type { OwnerDashboardPeriodDays } from '@/services/dashboard.service'

interface TrendPoint {
  date: string
  revenue: number
  orderCount: number
}

const props = defineProps<{
  trend: TrendPoint[]
  periodDays: OwnerDashboardPeriodDays
  loading?: boolean
}>()

const hasData = computed(() => props.trend.length > 0)

const chartSeries = computed(() => [
  { name: 'Revenue', data: props.trend.map((point) => point.revenue) },
  { name: 'Transaksi', data: props.trend.map((point) => point.orderCount) },
])

const chartOptions = computed(() => ({
  chart: {
    type: 'line',
    height: 300,
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  stroke: { curve: 'smooth', width: [3, 2] },
  colors: ['#4F46E5', '#10B981'],
  xaxis: {
    categories: props.trend.map((point) =>
      new Date(point.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
    ),
    labels: { style: { colors: '#6B7280' } },
  },
  yaxis: [
    {
      title: { text: 'Revenue (Rp)' },
      labels: {
        formatter: (value: number) => {
          if (value >= 1_000_000) {
            return `${(value / 1_000_000).toFixed(1)}M`
          }
          if (value >= 1_000) {
            return `${(value / 1_000).toFixed(0)}K`
          }
          return value.toFixed(0)
        },
        style: { colors: '#4F46E5' },
      },
    },
    {
      opposite: true,
      title: { text: 'Transaksi' },
      labels: { style: { colors: '#10B981' } },
    },
  ],
  grid: { borderColor: '#E5E7EB' },
  legend: { position: 'top' },
}))
</script>
