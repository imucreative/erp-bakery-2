<script setup lang="ts">
/**
 * PurchaseReturnSummary — read-only header meta card for a Purchase Return.
 * Renders the status badge, source GR, vendor, outlet, return date, submitted
 * and completed timestamps, creation time and optional notes. The entity embeds
 * supplierName/outletName, shown directly; the resolver props stay for signature
 * parity, and `grNumber` resolves the source GR number.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  PURCHASE_RETURN_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseReturn,
} from '@/services/purchase-return.service'

const props = defineProps<{
  pr: PurchaseReturn
  grNumber: (id: string) => string
  supplierName: (id: string) => string
  outletName: (id: string) => string
}>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.pr.status)">
          {{ PURCHASE_RETURN_STATUS_LABELS[props.pr.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">GR Sumber</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.grNumber(props.pr.goodsReceiptId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Vendor</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.pr.supplierName }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.pr.outletName }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Retur</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.pr.returnDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Diajukan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.pr.submittedAt ? formatDateTime(props.pr.submittedAt) : '—' }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Selesai</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.pr.completedAt ? formatDateTime(props.pr.completedAt) : '—' }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.pr.createdAt) }}
      </dd>
    </div>

    <div v-if="props.pr.notes" class="sm:col-span-2">
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Catatan</dt>
      <dd class="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{{ props.pr.notes }}</dd>
    </div>
  </dl>
</template>
