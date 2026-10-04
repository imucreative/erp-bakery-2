<script setup lang="ts">
/**
 * PaymentDrawer — single-method payment panel (OQ-7). The user picks a method
 * (CASH/CARD/QRIS/BANK_TRANSFER), and for CASH enters the amount tendered to see
 * the change (change = tendered − grandTotal, must be ≥ 0 to confirm). The
 * payment amount SENT is always exactly `grandTotal` (the tendered cash is
 * display-only for change); non-cash methods expose an optional referenceNo.
 *
 * Stateless w.r.t. the mutation: the parent runs the two-step checkout→pay and
 * owns `submitting` + `errorMessage`. `grandTotal` is the authoritative total —
 * once the parent has created the order it passes the server grandTotal here.
 * Slides in from the end edge (RTL-aware).
 */
import { computed, ref, watch } from 'vue'
import { CreditCard } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { formatRupiah } from '@/lib/format'
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  type PaymentMethod,
  type SalesPaymentInput,
} from '@/services/sales.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    grandTotal: number
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payment: SalesPaymentInput): void
}>()

const method = ref<PaymentMethod>('CASH')
const amountTendered = ref<number>(0)
const referenceNo = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      method.value = 'CASH'
      amountTendered.value = props.grandTotal
      referenceNo.value = ''
    }
  },
)

watch(
  () => props.grandTotal,
  (next) => {
    if (props.open && method.value === 'CASH') {
      amountTendered.value = next
    }
  },
)

const isCash = computed<boolean>(() => method.value === 'CASH')

const change = computed<number>(() => {
  const diff = amountTendered.value - props.grandTotal
  return diff > 0 ? diff : 0
})

const canConfirm = computed<boolean>(() => {
  if (props.submitting) {
    return false
  }
  if (props.grandTotal <= 0) {
    return false
  }
  // CASH requires the tendered amount to cover the total.
  if (isCash.value) {
    return amountTendered.value >= props.grandTotal
  }
  return true
})

function onConfirm(): void {
  if (!canConfirm.value) {
    return
  }
  // The sent amount is ALWAYS exactly grandTotal (anti-mismatch guard).
  const payment: SalesPaymentInput = {
    method: method.value,
    amount: props.grandTotal,
  }
  const ref = referenceNo.value.trim()
  if (!isCash.value && ref) {
    payment.referenceNo = ref
  }
  emit('confirm', payment)
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-99999 flex justify-end">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-s border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">Pembayaran</h4>
      <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Pilih metode pembayaran dan konfirmasi untuk menyelesaikan transaksi.
      </p>

      <div class="mb-5 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div class="flex items-center justify-between">
          <span class="text-theme-sm text-gray-500 dark:text-gray-400">Total Tagihan</span>
          <span class="text-xl font-semibold text-brand-600 dark:text-brand-400">
            {{ formatRupiah(props.grandTotal) }}
          </span>
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Metode Pembayaran
        </label>
        <div class="relative">
          <select
            v-model="method"
            class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option v-for="m in PAYMENT_METHODS" :key="m" :value="m">
              {{ PAYMENT_METHOD_LABELS[m] }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      <!-- CASH: amount tendered + change -->
      <template v-if="isCash">
        <div class="mb-4">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Uang Diterima (Rp)
          </label>
          <input
            v-model.number="amountTendered"
            type="number"
            min="0"
            step="1000"
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
        <div class="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/[0.03]">
          <span class="text-theme-sm text-gray-500 dark:text-gray-400">Kembalian</span>
          <span class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatRupiah(change) }}
          </span>
        </div>
      </template>

      <!-- Non-cash: optional reference number -->
      <div v-else class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          No. Referensi
        </label>
        <input
          v-model="referenceNo"
          type="text"
          placeholder="Opsional (mis. kode approval)"
          class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
      </div>

      <p
        v-if="props.errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ props.errorMessage }}
      </p>

      <div class="mt-auto flex justify-end gap-3 pt-4">
        <Button size="sm" variant="outline" :disabled="props.submitting" :on-click="() => emit('close')">
          Batal
        </Button>
        <button
          type="button"
          :disabled="!canConfirm"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          @click="onConfirm"
        >
          <CreditCard class="h-4 w-4" aria-hidden="true" />
          {{ props.submitting ? 'Memproses...' : 'Konfirmasi Bayar' }}
        </button>
      </div>
    </div>
  </div>
</template>
