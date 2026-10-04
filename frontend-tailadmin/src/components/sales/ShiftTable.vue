<script setup lang="ts">
/**
 * ShiftTable — presentational table for the Shift list. Columns: Outlet, Kasir,
 * Dibuka, Kas Awal, Kas Diharapkan, Kas Aktual, Selisih, Status (badge).
 * Pure presentation: outlet/cashier names resolve via injected callbacks.
 * Renders loading / error / empty states.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah, formatDateTime } from '@/lib/format'
import {
  SHIFT_STATUS_LABELS,
  shiftStatusBadgeColor,
  type Shift,
} from '@/services/sales.service'

const props = defineProps<{
  items: Shift[]
  loading: boolean
  errorMessage: string | null
  outletName: (id: string) => string
  cashierName: (id: string) => string
}>()
</script>

<template>
  <div>
    <div v-if="props.loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="props.errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ props.errorMessage }}
    </div>

    <div
      v-else-if="props.items.length === 0"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Belum ada shift kasir.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Outlet
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kasir
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Dibuka
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kas Awal
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kas Diharapkan
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Kas Aktual
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Selisih
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="shift in props.items"
            :key="shift.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ props.outletName(shift.outletId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ props.cashierName(shift.cashierUserId) }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatDateTime(shift.openedAt) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatRupiah(shift.openingCash) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ shift.expectedCash !== null ? formatRupiah(shift.expectedCash) : '—' }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ shift.actualCash !== null ? formatRupiah(shift.actualCash) : '—' }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ shift.discrepancy !== null ? formatRupiah(shift.discrepancy) : '—' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="shiftStatusBadgeColor(shift.status)">
                {{ SHIFT_STATUS_LABELS[shift.status] }}
              </Badge>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
