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
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.gr.status)">
          {{ GOODS_RECEIPT_STATUS_LABELS[props.gr.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">PO Sumber</dt>
      <dd class="mt-1 text-value">
        {{ props.poNumber(props.gr.purchaseOrderId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Vendor</dt>
      <dd class="mt-1 text-value">
        {{ props.supplierName(props.gr.supplierId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet Tujuan</dt>
      <dd class="mt-1 text-value">
        {{ props.outletName(props.gr.destinationOutletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Terima</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.gr.receiveDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Stok Diposting</dt>
      <dd class="mt-1 text-value">
        {{
          props.gr.inventoryPostedAt
            ? formatDateTime(props.gr.inventoryPostedAt)
            : 'Belum diposting'
        }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.gr.createdAt) }}
      </dd>
    </div>

    <div v-if="props.gr.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-value text-gray-700 dark:text-gray-300">{{ props.gr.notes }}</dd>
    </div>
  </dl>
</template>
