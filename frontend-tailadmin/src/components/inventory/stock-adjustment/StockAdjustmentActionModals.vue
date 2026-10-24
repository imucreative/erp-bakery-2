<script setup lang="ts">
/**
 * StockAdjustmentActionModals — a single confirmation modal driven by `action`
 * ('submit' | 'approve' | 'complete' | 'cancel' | null). The backend lifecycle
 * endpoints take NO request body, so this modal is a plain confirmation with no
 * note field — it only emits `confirm`. Complete explicitly warns that it posts
 * stock to inventory and cannot be undone. The parent runs the mutation and
 * surfaces backend errors via `errorMessage`, keeping the user on the page.
 * Backdrop, panel and Esc-close come from `BaseModal` (`size="md"`); the final
 * warning and the backend error are `BaseAlert` banners.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'

export type StockAdjustmentAction = 'submit' | 'approve' | 'complete' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: StockAdjustmentAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()

const isComplete = computed<boolean>(() => props.action === 'complete')
const isCancel = computed<boolean>(() => props.action === 'cancel')

const title = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan Penyesuaian Stok'
    case 'approve':
      return 'Setujui Penyesuaian Stok'
    case 'complete':
      return 'Selesaikan Penyesuaian Stok'
    case 'cancel':
      return 'Batalkan Penyesuaian Stok'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan penyesuaian ini untuk persetujuan? Dokumen tidak dapat diedit setelah diajukan.'
    case 'approve':
      return 'Setujui penyesuaian ini? Setelah disetujui dokumen siap diselesaikan untuk memposting stok.'
    case 'complete':
      return 'Menyelesaikan penyesuaian ini akan memposting perubahan stok ke inventory. Tindakan ini bersifat final dan tidak dapat dibatalkan.'
    case 'cancel':
      return 'Batalkan penyesuaian ini? Tindakan ini bersifat final.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan'
    case 'approve':
      return 'Setujui'
    case 'complete':
      return 'Selesaikan & Posting Stok'
    case 'cancel':
      return 'Batalkan'
    default:
      return 'Konfirmasi'
  }
})

const confirmVariant = computed<'primary' | 'success' | 'danger'>(() => {
  if (props.action === 'complete') return 'success'
  if (props.action === 'cancel') return 'danger'
  return 'primary'
})
</script>

<template>
  <BaseModal :open="Boolean(action)" @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-4">{{ description }}</p>

    <BaseAlert
      v-if="isComplete || isCancel"
      variant="warning"
      size="sm"
      class="mb-4 dark:text-orange-400"
    >
      <span class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span v-if="isComplete">
          Setelah selesai, penyesuaian tidak bisa diedit atau dibatalkan.
        </span>
        <span v-else>Penyesuaian yang dibatalkan tidak dapat dikembalikan.</span>
      </span>
    </BaseAlert>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
        Kembali
      </BaseButton>
      <BaseButton
        type="button"
        :variant="confirmVariant"
        :loading="submitting"
        loading-text="Memproses..."
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
