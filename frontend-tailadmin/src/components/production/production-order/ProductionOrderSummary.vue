<script setup lang="ts">
/**
 * ProductionOrderSummary — read-only header meta card for a completed Production
 * Order (instant-complete model). Renders the status badge, product, recipe,
 * outlet, target/success/waste quantities, production date, result expiry,
 * timestamps and optional notes. Pure presentation: resolves product/outlet/
 * recipe ids → names via injected resolver callbacks so it never fetches or
 * holds lookup state.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime, formatNumber } from '@/lib/format'
import {
  PRODUCTION_ORDER_STATUS_LABELS,
  statusBadgeColor,
  type ProductionOrder,
} from '@/services/production-order.service'

const props = defineProps<{
  order: ProductionOrder
  productName: (id: string) => string
  outletName: (id: string) => string
  recipeName: (id: string) => string
}>()
</script>

<template>
  <dl class="field-grid">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.order.status)">
          {{ PRODUCTION_ORDER_STATUS_LABELS[props.order.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Produk Jadi</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.productName || props.productName(props.order.productId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Resep</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.recipeName || props.recipeName(props.order.recipeId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.outletName || props.outletName(props.order.outletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Target</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatNumber(props.order.scheduledQty) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Berhasil</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.actualQty !== null ? formatNumber(props.order.actualQty) : '-' }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Gagal / Terbuang</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatNumber(props.order.wasteQty) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Produksi</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.order.productionDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Kedaluwarsa Hasil</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.order.resultExpiredDate ? formatDate(props.order.resultExpiredDate) : '-' }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.order.createdAt) }}
      </dd>
    </div>

    <div v-if="props.order.notes" class="sm:col-span-2">
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Catatan</dt>
      <dd class="mt-1 text-body">
        {{ props.order.notes }}
      </dd>
    </div>
  </dl>
</template>
