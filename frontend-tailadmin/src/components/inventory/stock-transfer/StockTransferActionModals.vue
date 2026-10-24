<script setup lang="ts">
/**
 * StockTransferActionModals — a single confirmation modal driven by `action`
 * ('submit' | 'dispatch' | 'receive' | 'cancel' | null). The backend lifecycle
 * endpoints take NO request body, so this modal is a plain confirmation with no
 * note field — it only emits `confirm`. Dispatch explicitly warns that it posts
 * TRANSFER_OUT and decrements source stock; receive warns that it posts
 * TRANSFER_IN into the destination outlet. The parent runs the mutation and
 * surfaces backend errors via `errorMessage`, keeping the user on the page.
 * Backdrop, panel and Esc/close come from `BaseModal`.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'

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
const showWarning = computed<boolean>(() => isDispatch.value || isReceive.value || isCancel.value)

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

const confirmVariant = computed<'primary' | 'success' | 'danger'>(() => {
  if (props.action === 'receive') return 'success'
  if (props.action === 'cancel') return 'danger'
  return 'primary'
})
</script>

<template>
  <BaseModal :open="Boolean(action)" @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-4">{{ description }}</p>

    <BaseAlert v-if="showWarning" variant="warning" size="sm" class="mb-4 dark:text-orange-400">
      <span class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ warningText }}</span>
      </span>
    </BaseAlert>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
        Kembali
      </BaseButton>
      <BaseButton
        size="sm"
        :variant="confirmVariant"
        :disabled="submitting"
        :loading="submitting"
        loading-text="Memproses..."
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
