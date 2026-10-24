<script setup lang="ts">
/**
 * StockTransferSummary — read-only header meta card for a Stock Transfer.
 * Renders the status badge, source/destination outlets, transfer date, item
 * count, creation/update time and optional notes. Pure presentation: resolves
 * outlet ids → names via an injected resolver callback so it never fetches or
 * holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  TRANSFER_STATUS_LABELS,
  statusBadgeColor,
  type StockTransfer,
} from '@/services/stock-transfer.service'

const props = defineProps<{
  transfer: StockTransfer
  outletName: (id: string) => string
}>()
</script>

<template>
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.transfer.status)">
          {{ TRANSFER_STATUS_LABELS[props.transfer.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Transfer</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.transfer.transferDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet Sumber</dt>
      <dd class="mt-1 text-value">
        {{ props.outletName(props.transfer.sourceOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet Tujuan</dt>
      <dd class="mt-1 text-value">
        {{ props.outletName(props.transfer.destinationOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Jumlah Item</dt>
      <dd class="mt-1 text-value">
        {{ props.transfer.items.length }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.transfer.createdAt) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Diperbarui</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.transfer.updatedAt) }}
      </dd>
    </div>

    <div v-if="props.transfer.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-body">
        {{ props.transfer.notes }}
      </dd>
    </div>
  </dl>
</template>
