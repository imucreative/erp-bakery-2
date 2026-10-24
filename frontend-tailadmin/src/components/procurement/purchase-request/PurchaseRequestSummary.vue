<script setup lang="ts">
/**
 * PurchaseRequestSummary — read-only header meta card for a Purchase Request.
 * Renders the status badge, destination outlet, needed date, created-at, and
 * optional notes. Pure presentation: resolves ids → names via injected
 * resolver callbacks so it never fetches or holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  PURCHASE_REQUEST_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseRequest,
} from '@/services/purchase-request.service'

const props = defineProps<{
  pr: PurchaseRequest
  outletName: (id: string) => string
}>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.pr.status)">
          {{ PURCHASE_REQUEST_STATUS_LABELS[props.pr.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet Tujuan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.outletName(props.pr.destinationOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Dibutuhkan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.pr.expectedDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.pr.createdAt) }}
      </dd>
    </div>
    <div v-if="props.pr.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{{ props.pr.notes }}</dd>
    </div>
  </dl>
</template>
