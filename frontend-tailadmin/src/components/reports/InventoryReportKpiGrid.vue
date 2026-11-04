<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-5">
    <KpiCard title="Total Products" :value="summary.totalProducts" format="number" />
    <KpiCard title="Total Batches" :value="summary.totalBatches" format="number" />
    <KpiCard title="Stock Value" :value="summary.totalStockValue" format="currency" />
    <KpiCard
      title="Low Stock"
      :value="summary.lowStockCount"
      format="number"
      trend-color="amber"
    />
    <KpiCard title="Expired" :value="summary.expiredCount" format="number" trend-color="red" />
  </div>
</template>

<script setup lang="ts">
import KpiCard from '@/components/dashboard/KpiCard.vue'

defineProps<{
  summary: {
    totalProducts: number
    totalBatches: number
    totalStockValue: number
    lowStockCount: number
    expiredCount: number
  }
}>()
</script>
