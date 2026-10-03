<script setup lang="ts">
/**
 * StockTransferActionModals — a single confirmation modal driven by `action`
 * ('submit' | 'dispatch' | 'receive' | 'cancel' | null). The backend lifecycle
 * endpoints take NO request body, so this modal is a plain confirmation with no
 * note field — it only emits `confirm`. Dispatch explicitly warns that it posts
 * TRANSFER_OUT and decrements source stock; receive warns that it posts
 * TRANSFER_IN into the destination outlet. The parent runs the mutation and
 * surfaces backend errors via `errorMessage`, keeping the user on the page.
 * Transparent backdrop + rounded-3xl panel per the UI standard.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

export type StockTransferAction = 'submit' | 'dispatch' | 'receive' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: StockTransferAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()

const isDispatch = computed<boolean>(() => props.action === 'dispatch')
const isReceive = computed<boolean>(() => props.action === 'receive')
const isCancel = computed<boolean>(() => props.action === 'cancel')
const showWarning = computed<boolean>(
  () => isDispatch.value || isReceive.value || isCancel.value,
)

const title = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan Transfer Stok'
    case 'dispatch':
      return 'Kirim Transfer Stok'
    case 'receive':
      return 'Terima Transfer Stok'
    case 'cancel':
      return 'Batalkan Transfer Stok'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan transfer ini? Dokumen tidak dapat diedit setelah diajukan.'
    case 'dispatch':
      return 'Mengirim transfer ini akan memposting pengeluaran stok (TRANSFER_OUT) dan mengurangi stok batch di outlet sumber.'
    case 'receive':
      return 'Menerima transfer ini akan memposting penerimaan stok (TRANSFER_IN) ke outlet tujuan. Tindakan ini bersifat final.'
    case 'cancel':
      return 'Batalkan transfer ini? Tindakan ini bersifat final.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan'
    case 'dispatch':
      return 'Kirim & Posting Keluar'
    case 'receive':
      return 'Terima & Posting Masuk'
    case 'cancel':
      return 'Batalkan'
    default:
      return 'Konfirmasi'
  }
})

const warningText = computed<string>(() => {
  switch (props.action) {
    case 'dispatch':
      return 'Setelah dikirim, stok outlet sumber berkurang dan transfer tidak dapat dibatalkan.'
    case 'receive':
      return 'Setelah diterima, transfer selesai dan tidak dapat diubah.'
    case 'cancel':
      return 'Transfer yang dibatalkan tidak dapat dikembalikan.'
    default:
      return ''
  }
})

const confirmClass = computed<string>(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-60'
  if (props.action === 'receive') {
    return `${base} bg-success-500 hover:bg-success-600`
  }
  if (props.action === 'cancel') {
    return `${base} bg-error-500 hover:bg-error-600`
  }
  return `${base} bg-brand-500 hover:bg-brand-600`
})
</script>

<template>
  <div
    v-if="action"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h4>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>

      <div
        v-if="showWarning"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ warningText }}</span>
      </div>

      <p
        v-if="errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
          Kembali
        </Button>
        <button type="button" :disabled="submitting" :class="confirmClass" @click="emit('confirm')">
          {{ submitting ? 'Memproses...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
