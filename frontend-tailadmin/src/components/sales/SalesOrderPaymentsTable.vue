<script setup lang="ts">
/**
 * SalesOrderPaymentsTable — read-only payments table for a Sales Order detail
 * view. Columns: Metode (badge), Jumlah, No. Referensi, Dibayar. Renders a tidy
 * empty state when the order has not been paid yet.
 */
import Badge from '@/components/ui/Badge.vue'
import { BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatRupiah, formatDateTime } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, type SalesPayment } from '@/services/sales.service'

const props = defineProps<{
  payments: SalesPayment[]
}>()
</script>

<template>
  <BaseTable
    :is-empty="props.payments.length === 0"
    empty-message="Belum ada pembayaran."
    aria-label="Daftar pembayaran sales order"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Metode</BaseTableHead>
        <BaseTableHead align="end">Jumlah</BaseTableHead>
        <BaseTableHead>No. Referensi</BaseTableHead>
        <BaseTableHead>Dibayar</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="payment in props.payments" :key="payment.id">
        <BaseTableCell>
          <Badge size="sm" color="light">
            {{ PAYMENT_METHOD_LABELS[payment.paymentMethod] }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">{{
          formatRupiah(payment.amount)
        }}</BaseTableCell>
        <BaseTableCell>{{ payment.referenceNo || '—' }}</BaseTableCell>
        <BaseTableCell>{{ formatDateTime(payment.paidAt) }}</BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
