<script setup lang="ts">
/**
 * PurchaseReturnTable — presentational table for the Purchase Return list.
 * Columns: Return Number, GR sumber, Vendor, Return Date, Status (badge). Row
 * action is icon-only (view/detail). Renders loading / error / empty states.
 * Supplier/outlet names come embedded on the entity; GR numbers are resolved by
 * the parent via an injected resolver callback (fetched once for the page).
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { formatDate } from '@/lib/format'
import {
  PURCHASE_RETURN_STATUS_LABELS,
  statusBadgeColor,
  type PurchaseReturn,
} from '@/services/purchase-return.service'

defineProps<{
  items: PurchaseReturn[]
  loading: boolean
  errorMessage: string | null
  grNumber: (id: string) => string
}>()

defineEmits<{
  (event: 'view', pr: PurchaseReturn): void
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
      Belum ada purchase return.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nomor Retur
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              GR Sumber
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Vendor
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Tanggal Retur
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
          <tr v-for="pr in items" :key="pr.id" class="border-b border-gray-100 dark:border-gray-800">
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ pr.returnNumber }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ grNumber(pr.goodsReceiptId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ pr.supplierName }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatDate(pr.returnDate) }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="statusBadgeColor(pr.status)">
                {{ PURCHASE_RETURN_STATUS_LABELS[pr.status] }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label="Lihat detail"
                  title="Lihat detail"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('view', pr)"
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
