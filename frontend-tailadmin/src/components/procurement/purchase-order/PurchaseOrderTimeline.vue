<script setup lang="ts">
/**
 * PurchaseOrderTimeline — vertical approval timeline rendered from the PO's
 * `statusLogs` (chronological). Each entry shows the transition (fromStatus →
 * toStatus as colored badges), the actor name, an optional note, and the
 * timestamp (Asia/Jakarta). The create entry has `fromStatus = null`, rendered
 * as the document's creation. Actor is shown by `actorName` (never a UUID),
 * falling back to an em dash when null.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDateTime } from '@/lib/format'
import {
  PURCHASE_ORDER_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseOrderStatusLog,
} from '@/services/purchase-order.service'

defineProps<{
  logs: PurchaseOrderStatusLog[]
}>()

function actorLabel(log: PurchaseOrderStatusLog): string {
  return log.actorName?.trim() || '—'
}
</script>

<template>
  <div>
    <p v-if="logs.length === 0" class="text-muted">Belum ada riwayat status.</p>

    <ol v-else class="relative space-y-6 border-s border-gray-200 ps-6 dark:border-gray-800">
      <li v-for="log in logs" :key="log.id" class="relative">
        <span
          class="absolute -start-[1.9rem] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-4 ring-white dark:ring-gray-900"
          aria-hidden="true"
        ></span>
        <div class="flex flex-col gap-1.5">
          <div class="flex flex-wrap items-center gap-2">
            <template v-if="log.fromStatus">
              <Badge :color="statusBadgeColor(log.fromStatus)">
                {{ PURCHASE_ORDER_STATUS_LABELS[log.fromStatus] }}
              </Badge>
              <span class="text-gray-400 dark:text-gray-500" aria-hidden="true">→</span>
            </template>
            <Badge :color="statusBadgeColor(log.toStatus)">
              {{ PURCHASE_ORDER_STATUS_LABELS[log.toStatus] }}
            </Badge>
          </div>
          <p class="text-theme-sm text-gray-700 dark:text-gray-300">
            oleh <span class="font-medium">{{ actorLabel(log) }}</span>
          </p>
          <p v-if="log.note" class="text-muted">"{{ log.note }}"</p>
          <p class="text-theme-xs text-gray-400 dark:text-gray-500">
            {{ formatDateTime(log.createdAt) }}
          </p>
        </div>
      </li>
    </ol>
  </div>
</template>
