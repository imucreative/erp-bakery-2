<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      @click="emit('openLowStock')"
    />
    <KpiCard
      title="Produk Kedaluwarsa"
      :value="summary?.expiredCount || 0"
      format="number"
      :icon="Clock"
      trend-color="red"
      clickable
      @click="emit('openExpired')"
    />
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Clock, DollarSign, ShoppingCart } from 'lucide-vue-next'
import KpiCard from './KpiCard.vue'

defineProps<{
  summary: {
    revenueToday: number
    salesToday: number
    lowStockCount: number
    expiredCount: number
  } | null
}>()

const emit = defineEmits<{
  openLowStock: []
  openExpired: []
}>()
</script>
