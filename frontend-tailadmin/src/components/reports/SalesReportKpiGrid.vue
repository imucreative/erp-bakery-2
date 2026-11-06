<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
    <KpiCard title="Total Orders" :value="summary.totalOrders" format="number" />
    <KpiCard title="Total Revenue" :value="summary.totalRevenue" format="currency" />
    <KpiCard title="Avg Order Value" :value="summary.averageOrderValue" format="currency" />
    <KpiCard title="Items Sold" :value="summary.totalItemsSold" format="number" />
  </div>
</template>

<script setup lang="ts">
import KpiCard from '@/components/dashboard/KpiCard.vue'

defineProps<{
  summary: {
    totalOrders: number
    totalRevenue: number
    averageOrderValue: number
    totalItemsSold: number
  }
}>()
</script>
