<script setup lang="ts">
/**
 * StockAdjustmentSummary — read-only header meta card for a Stock Adjustment.
 * Renders the status badge, outlet, adjustment date, item count, creation time
 * and optional notes. Pure presentation: resolves the outlet id → name via an
 * injected resolver callback so it never fetches or holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  STOCK_ADJUSTMENT_STATUS_LABELS,
  statusBadgeColor,
  type StockAdjustment,
} from '@/services/stock-adjustment.service'

const props = defineProps<{
  adjustment: StockAdjustment
  outletName: (id: string) => string
}>()
</script>

<template>
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.adjustment.status)">
          {{ STOCK_ADJUSTMENT_STATUS_LABELS[props.adjustment.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet</dt>
      <dd class="mt-1 text-value">
        {{ props.outletName(props.adjustment.outletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Penyesuaian</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.adjustment.adjustmentDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Jumlah Item</dt>
      <dd class="mt-1 text-value">
        {{ props.adjustment.items.length }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.adjustment.createdAt) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Diperbarui</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.adjustment.updatedAt) }}
      </dd>
    </div>

    <div v-if="props.adjustment.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-body">
        {{ props.adjustment.notes }}
      </dd>
    </div>
  </dl>
</template>
