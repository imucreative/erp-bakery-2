<script setup lang="ts">
/**
 * Dashboard (owner-level overview).
 *
 * Inventory metrics are REAL (GET /inventory/dashboard). Revenue/sales metrics
 * require the Sales module (not built yet) and are shown as clearly-labelled
 * "menunggu Sales" placeholders — no fabricated numbers.
 */
import { computed, onMounted } from 'vue'
import { Package, Boxes, AlertTriangle, CalendarClock, Truck, TrendingUp } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import { useDashboard } from '@/composables/useDashboard'

const pageTitle = 'Dashboard'
const { summary, loading, errorMessage, load } = useDashboard()

interface Metric {
  key: string
  label: string
  value: string
  icon: typeof Package
  tone: 'brand' | 'warning' | 'error' | 'muted'
}

const inventoryMetrics = computed<Metric[]>(() => {
  const s = summary.value
  return [
    {
      key: 'products',
      label: 'Produk Ada Stok',
      value: s ? String(s.totalProductsInStock) : '—',
      icon: Package,
      tone: 'brand',
    },
    {
      key: 'batches',
      label: 'Batch Aktif',
      value: s ? String(s.totalActiveBatches) : '—',
      icon: Boxes,
      tone: 'brand',
    },
    {
      key: 'low',
      label: 'Stok Menipis',
      value: s ? String(s.lowStockCount) : '—',
      icon: AlertTriangle,
      tone: 'warning',
    },
    {
      key: 'expiring',
      label: 'Akan Kedaluwarsa',
      value: s ? String(s.expiringSoonCount) : '—',
      icon: CalendarClock,
      tone: 'warning',
    },
    {
      key: 'expired',
      label: 'Sudah Kedaluwarsa',
      value: s ? String(s.expiredCount) : '—',
      icon: AlertTriangle,
      tone: 'error',
    },
    {
      key: 'transit',
      label: 'Transfer In-Transit',
      value: s ? String(s.inTransitTransfers) : '—',
      icon: Truck,
      tone: 'muted',
    },
  ]
})

const toneClass: Record<Metric['tone'], string> = {
  brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  muted: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-300',
}

onMounted(() => {
  void load()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <div class="space-y-6">
      <!-- Inventory metrics (real data) -->
      <ComponentCard
        title="Ringkasan Inventory"
        desc="Data langsung dari inventory perusahaan Anda."
      >
        <div v-if="errorMessage" class="alert-error px-4 py-3" role="alert">
          {{ errorMessage }}
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="m in inventoryMetrics"
            :key="m.key"
            class="rounded-2xl border border-gray-200 p-5 dark:border-gray-800"
          >
            <div class="flex items-center gap-3">
              <span
                class="flex h-11 w-11 items-center justify-center rounded-xl"
                :class="toneClass[m.tone]"
              >
                <component :is="m.icon" class="h-5 w-5" aria-hidden="true" />
              </span>
              <div class="min-w-0">
                <p class="text-muted">{{ m.label }}</p>
                <p class="text-title-sm font-semibold text-gray-800 dark:text-white/90">
                  <span v-if="loading" class="text-gray-400">…</span>
                  <span v-else>{{ m.value }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </ComponentCard>

      <!-- Sales metrics (pending Sales module) -->
      <ComponentCard title="Penjualan" desc="Menunggu modul Sales/POS dibangun.">
        <template #actions>
          <Badge color="light">Menunggu Sales</Badge>
        </template>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            class="rounded-2xl border border-dashed border-gray-300 p-5 text-center dark:border-gray-700"
          >
            <TrendingUp class="mx-auto mb-2 h-6 w-6 text-gray-400" aria-hidden="true" />
            <p class="text-muted">Pendapatan Hari Ini</p>
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Tersedia setelah modul Sales
            </p>
          </div>
          <div
            class="rounded-2xl border border-dashed border-gray-300 p-5 text-center dark:border-gray-700"
          >
            <TrendingUp class="mx-auto mb-2 h-6 w-6 text-gray-400" aria-hidden="true" />
            <p class="text-muted">Transaksi Hari Ini</p>
            <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
              Tersedia setelah modul Sales
            </p>
          </div>
        </div>
      </ComponentCard>
    </div>
  </AdminLayout>
</template>
