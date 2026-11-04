<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <KpiCard title="Total Orders" :value="summary.totalOrders" format="number" />
    <KpiCard title="Total Produced" :value="summary.totalProduced" format="number" />
    <KpiCard title="Total Waste" :value="summary.totalWaste" format="number" trend-color="red" />
    <KpiCard title="Average Yield" :value="summary.averageYield" format="percent" />
  </div>
</template>

<script setup lang="ts">
import KpiCard from '@/components/dashboard/KpiCard.vue'

defineProps<{
  summary: {
    totalOrders: number
    totalProduced: number
    totalWaste: number
    averageYield: number
  }
}>()
</script>
