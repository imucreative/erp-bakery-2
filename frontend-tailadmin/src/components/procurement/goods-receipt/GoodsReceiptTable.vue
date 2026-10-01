<script setup lang="ts">
/**
 * GoodsReceiptTable — presentational table for the GR list. Columns:
 * GR Number, PO sumber, Supplier, Receive Date, Status (badge). Row action is
 * icon-only (view/detail). Renders loading / error / empty states. PO numbers
 * and supplier names are resolved by the parent via injected resolver
 * callbacks (fetched once for the whole page).
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatDate } from '@/lib/format'
import {
  GOODS_RECEIPT_STATUS_LABELS,
  statusBadgeColor,
  type GoodsReceipt,
} from '@/services/goods-receipt.service'

defineProps<{
  items: GoodsReceipt[]
  loading: boolean
  errorMessage: string | null
  poNumber: (id: string) => string
  supplierName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', gr: GoodsReceipt): void
}>()
</script>

<template>
  <div>
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Belum ada goods receipt.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nomor GR
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              PO Sumber
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Vendor
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Tanggal Terima
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="gr in items" :key="gr.id" class="border-b border-gray-100 dark:border-gray-800">
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ gr.grNumber }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ poNumber(gr.purchaseOrderId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ supplierName(gr.supplierId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatDate(gr.receiveDate) }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="statusBadgeColor(gr.status)">
                {{ GOODS_RECEIPT_STATUS_LABELS[gr.status] }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label="Lihat detail"
                  title="Lihat detail"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('view', gr)"
                >
                  <Eye class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
