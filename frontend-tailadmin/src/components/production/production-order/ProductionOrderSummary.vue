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
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.order.status)">
          {{ PRODUCTION_ORDER_STATUS_LABELS[props.order.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Produk Jadi</dt>
      <dd class="mt-1 text-value">
        {{ props.order.productName || props.productName(props.order.productId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Resep</dt>
      <dd class="mt-1 text-value">
        {{ props.order.recipeName || props.recipeName(props.order.recipeId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet</dt>
      <dd class="mt-1 text-value">
        {{ props.order.outletName || props.outletName(props.order.outletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Target</dt>
      <dd class="mt-1 text-value">
        {{ formatNumber(props.order.scheduledQty) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Berhasil</dt>
      <dd class="mt-1 text-value">
        {{ props.order.actualQty !== null ? formatNumber(props.order.actualQty) : '-' }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Gagal / Terbuang</dt>
      <dd class="mt-1 text-value">
        {{ formatNumber(props.order.wasteQty) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Produksi</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.order.productionDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Kedaluwarsa Hasil</dt>
      <dd class="mt-1 text-value">
        {{ props.order.resultExpiredDate ? formatDate(props.order.resultExpiredDate) : '-' }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.order.createdAt) }}
      </dd>
    </div>

    <div v-if="props.order.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-body">
        {{ props.order.notes }}
      </dd>
    </div>
  </dl>
</template>
