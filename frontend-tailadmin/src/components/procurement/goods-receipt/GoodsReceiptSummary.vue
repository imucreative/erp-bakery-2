<script setup lang="ts">
/**
 * GoodsReceiptSummary — read-only header meta card for a Goods Receipt.
 * Renders the status badge, source PO, supplier, destination outlet, receive
 * date, inventory-posted timestamp (when posted), creation time and optional
 * notes. Pure presentation: resolves ids → names via injected resolver
 * callbacks so it never fetches or holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  GOODS_RECEIPT_STATUS_LABELS,
  statusBadgeColor,
  type GoodsReceipt,
} from '@/services/goods-receipt.service'

const props = defineProps<{
  gr: GoodsReceipt
  poNumber: (id: string) => string
  supplierName: (id: string) => string
  outletName: (id: string) => string
}>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.gr.status)">
          {{ GOODS_RECEIPT_STATUS_LABELS[props.gr.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">PO Sumber</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.poNumber(props.gr.purchaseOrderId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Vendor</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.supplierName(props.gr.supplierId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Outlet Tujuan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.outletName(props.gr.destinationOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Tanggal Terima</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDate(props.gr.receiveDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Stok Diposting</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{
          props.gr.inventoryPostedAt
            ? formatDateTime(props.gr.inventoryPostedAt)
            : 'Belum diposting'
        }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.gr.createdAt) }}
      </dd>
    </div>

    <div v-if="props.gr.notes" class="sm:col-span-2">
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Catatan</dt>
      <dd class="mt-1 text-theme-sm text-gray-700 dark:text-gray-300">{{ props.gr.notes }}</dd>
    </div>
  </dl>
</template>
