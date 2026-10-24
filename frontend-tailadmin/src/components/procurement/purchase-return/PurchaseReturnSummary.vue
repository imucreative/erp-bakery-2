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
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.pr.status)">
          {{ PURCHASE_RETURN_STATUS_LABELS[props.pr.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">GR Sumber</dt>
      <dd class="mt-1 text-value">
        {{ props.grNumber(props.pr.goodsReceiptId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Vendor</dt>
      <dd class="mt-1 text-value">
        {{ props.pr.supplierName }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet</dt>
      <dd class="mt-1 text-value">
        {{ props.pr.outletName }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Retur</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.pr.returnDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Diajukan</dt>
      <dd class="mt-1 text-value">
        {{ props.pr.submittedAt ? formatDateTime(props.pr.submittedAt) : '—' }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Selesai</dt>
      <dd class="mt-1 text-value">
        {{ props.pr.completedAt ? formatDateTime(props.pr.completedAt) : '—' }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.pr.createdAt) }}
      </dd>
    </div>

    <div v-if="props.pr.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-body">{{ props.pr.notes }}</dd>
    </div>
  </dl>
</template>
