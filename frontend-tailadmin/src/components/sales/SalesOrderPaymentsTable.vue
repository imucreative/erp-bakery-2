<script setup lang="ts">
/**
 * SalesOrderPaymentsTable — read-only payments table for a Sales Order detail
 * view. Columns: Metode (badge), Jumlah, No. Referensi, Dibayar. Renders a tidy
 * empty state when the order has not been paid yet.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatRupiah, formatDateTime } from '@/lib/format'
import {
  PAYMENT_METHOD_LABELS,
  type SalesPayment,
} from '@/services/sales.service'

const props = defineProps<{
  payments: SalesPayment[]
}>()
</script>

<template>
  <div
    v-if="props.payments.length === 0"
    class="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
  >
    Belum ada pembayaran.
  </div>

  <div v-else class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Metode
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Jumlah
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            No. Referensi
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Dibayar
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="payment in props.payments"
          :key="payment.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3">
            <Badge size="sm" color="light">
              {{ PAYMENT_METHOD_LABELS[payment.paymentMethod] }}
            </Badge>
          </td>
          <td class="px-4 py-3 text-end text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ formatRupiah(payment.amount) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ payment.referenceNo || '—' }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatDateTime(payment.paidAt) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
