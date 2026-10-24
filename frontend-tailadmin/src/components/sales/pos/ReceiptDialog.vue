<script setup lang="ts">
/**
 * ReceiptDialog — post-payment receipt shown after an order reaches PAID. Lists
 * the invoice, items (with topping sub-lines), the totals breakdown, and the
 * payment(s), plus the change for a CASH payment. "Selesai" resets the cart and
 * closes. Stateless: the parent passes the PAID order and the computed change.
 * Transparent backdrop per UI standard.
 */
import { CheckCircle2, Printer } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'
import { formatRupiah, formatNumber, formatDateTime } from '@/lib/format'
import { PAYMENT_METHOD_LABELS, type SalesOrder } from '@/services/sales.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    order: SalesOrder | null
    /** Change for a CASH payment (tendered − grandTotal); 0 for non-cash. */
    change?: number
  }>(),
  { change: 0 },
)

const emit = defineEmits<{
  (event: 'done'): void
}>()

function onPrint(): void {
  window.print()
}
</script>

<template>
  <div
    v-if="props.open && props.order"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
    ></div>

    <div
      class="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mb-4 flex items-center gap-2 text-success-600 dark:text-success-500">
        <CheckCircle2 class="h-6 w-6" aria-hidden="true" />
        <h4 class="modal-title">Pembayaran Berhasil</h4>
      </div>

      <div class="mb-4 text-center">
        <p class="text-muted">Invoice</p>
        <p class="text-base font-semibold text-gray-800 dark:text-white/90">
          {{ props.order.invoiceNumber }}
        </p>
        <p class="mt-0.5 text-theme-xs text-gray-400 dark:text-gray-500">
          {{ formatDateTime(props.order.paidAt ?? props.order.orderDate) }}
        </p>
      </div>

      <div class="flex-1 overflow-y-auto">
        <div class="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div
            v-for="item in props.order.items"
            :key="item.id"
            class="border-b border-gray-100 py-2 last:border-0 dark:border-gray-800"
          >
            <div class="flex items-start justify-between gap-2 text-theme-sm">
              <span class="text-gray-800 dark:text-white/90">
                {{ formatNumber(item.qty) }}× {{ item.productNameSnapshot }}
              </span>
              <span class="text-gray-800 dark:text-white/90">{{
                formatRupiah(item.lineTotal)
              }}</span>
            </div>
            <ul v-if="item.toppings.length > 0" class="mt-0.5 space-y-0.5">
              <li
                v-for="topping in item.toppings"
                :key="topping.id"
                class="text-theme-xs text-gray-500 dark:text-gray-400"
              >
                + {{ topping.toppingNameSnapshot }}
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-4 space-y-2 text-theme-sm">
          <div class="flex items-center justify-between">
            <span class="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span class="text-gray-800 dark:text-white/90">{{
              formatRupiah(props.order.subtotal)
            }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-gray-500 dark:text-gray-400">Diskon Order</span>
            <span class="text-gray-800 dark:text-white/90">{{
              formatRupiah(props.order.orderDiscount)
            }}</span>
          </div>
          <div
            class="flex items-center justify-between border-t border-gray-200 pt-2 text-base font-semibold dark:border-gray-800"
          >
            <span class="text-gray-800 dark:text-white/90">Grand Total</span>
            <span class="text-brand-600 dark:text-brand-400">{{
              formatRupiah(props.order.grandTotal)
            }}</span>
          </div>
        </div>

        <div class="mt-4 space-y-2 rounded-xl bg-gray-50 p-4 text-theme-sm dark:bg-white/[0.03]">
          <div
            v-for="payment in props.order.payments"
            :key="payment.id"
            class="flex items-center justify-between"
          >
            <span class="text-gray-500 dark:text-gray-400">
              {{ PAYMENT_METHOD_LABELS[payment.paymentMethod] }}
            </span>
            <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(payment.amount) }}</span>
          </div>
          <div
            v-if="props.change > 0"
            class="flex items-center justify-between border-t border-gray-200 pt-2 font-medium dark:border-gray-700"
          >
            <span class="text-gray-500 dark:text-gray-400">Kembalian</span>
            <span class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.change) }}</span>
          </div>
        </div>
      </div>

      <div class="mt-6 button-row">
        <BaseButton size="sm" variant="outline" @click="onPrint">
          <template #start-icon>
            <Printer class="h-4 w-4" aria-hidden="true" />
          </template>
          Cetak
        </BaseButton>
        <BaseButton size="sm" variant="primary" @click="emit('done')">Selesai</BaseButton>
      </div>
    </div>
  </div>
</template>
