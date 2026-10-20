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
import { BaseButton, BaseFormField, BaseInput, BaseSelect } from '@/components/ui'
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

      <BaseFormField label="Metode Pembayaran" field-id="pos-payment-method" class="mb-4">
        <BaseSelect
          id="pos-payment-method"
          :model-value="method"
          :options="PAYMENT_METHODS.map((m) => ({ label: PAYMENT_METHOD_LABELS[m], value: m }))"
          @update:model-value="method = $event as PaymentMethod"
        />
      </BaseFormField>

      <!-- CASH: amount tendered + change -->
      <template v-if="isCash">
        <BaseFormField label="Uang Diterima (Rp)" field-id="pos-amount-tendered" class="mb-4">
          <BaseInput
            id="pos-amount-tendered"
            :model-value="amountTendered"
            type="number"
            min="0"
            step="1000"
            @update:model-value="amountTendered = Number($event)"
          />
        </BaseFormField>
        <div
          class="mb-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 dark:bg-white/[0.03]"
        >
          <span class="text-theme-sm text-gray-500 dark:text-gray-400">Kembalian</span>
          <span class="text-theme-sm font-semibold text-gray-800 dark:text-white/90">
            {{ formatRupiah(change) }}
          </span>
        </div>
      </template>

      <!-- Non-cash: optional reference number -->
      <BaseFormField v-else label="No. Referensi" field-id="pos-reference-no" class="mb-4">
        <BaseInput
          id="pos-reference-no"
          :model-value="referenceNo"
          placeholder="Opsional (mis. kode approval)"
          @update:model-value="referenceNo = $event"
        />
      </BaseFormField>

      <p
        v-if="props.errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ props.errorMessage }}
      </p>

      <div class="mt-auto flex justify-end gap-3 pt-4">
        <BaseButton size="sm" variant="outline" :disabled="props.submitting" @click="emit('close')">
          Batal
        </BaseButton>
        <BaseButton
          size="sm"
          :loading="props.submitting"
          loading-text="Memproses..."
          :disabled="!canConfirm"
          @click="onConfirm"
        >
          <template #start-icon>
            <CreditCard class="h-4 w-4" aria-hidden="true" />
          </template>
          Konfirmasi Bayar
        </BaseButton>
      </div>
    </div>
  </div>
</template>
