<script setup lang="ts">
/**
 * PurchaseRequestActionModals — a single confirmation modal driven by `action`
 * ('approve' | 'reject' | 'cancel' | null). Approve/cancel expose an optional
 * note; reject requires a note (validated locally before emitting `confirm`).
 * The parent runs the mutation and surfaces backend errors via `errorMessage`,
 * keeping the user on the page. Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import { BaseAlert, BaseButton, BaseModal, BaseTextarea } from '@/components/ui'

export type PurchaseRequestAction = 'approve' | 'reject' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: PurchaseRequestAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', note: string): void
}>()

const note = ref<string>('')
const localError = ref<string | null>(null)

// Reset the note each time a modal opens.
watch(
  () => props.action,
  (next) => {
    if (next) {
      note.value = ''
      localError.value = null
    }
  },
)

const isReject = computed<boolean>(() => props.action === 'reject')
const noteRequired = computed<boolean>(() => isReject.value)

const title = computed<string>(() => {
  switch (props.action) {
    case 'approve':
      return 'Setujui Purchase Request'
    case 'reject':
      return 'Tolak Purchase Request'
    case 'cancel':
      return 'Batalkan Purchase Request'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'approve':
      return 'Setujui PR ini? Anda dapat menambahkan catatan opsional.'
    case 'reject':
      return 'Tolak PR ini. Catatan wajib diisi untuk menjelaskan alasan penolakan.'
    case 'cancel':
      return 'Batalkan PR ini? Tindakan ini bersifat final. Catatan opsional.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'approve':
      return 'Setujui'
    case 'reject':
      return 'Tolak'
    case 'cancel':
      return 'Batalkan PR'
    default:
      return 'Konfirmasi'
  }
})

function onConfirm(): void {
  const trimmed = note.value.trim()
  if (noteRequired.value && trimmed.length === 0) {
    localError.value = 'Catatan wajib diisi untuk menolak PR.'
    return
  }
  localError.value = null
  emit('confirm', trimmed)
}
</script>

<template>
  <BaseModal :open="Boolean(action)" @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-4">{{ description }}</p>

    <div class="mb-4">
      <label class="form-label">
        Catatan<span v-if="noteRequired" class="text-error-500">*</span>
      </label>
      <BaseTextarea
        id="purchase-request-action-note"
        :model-value="note"
        :rows="3"
        :placeholder="noteRequired ? 'Alasan penolakan...' : 'Catatan opsional...'"
        @update:model-value="note = $event"
      />
    </div>

    <BaseAlert :message="localError || errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
        Batal
      </BaseButton>
      <BaseButton
        type="button"
        :variant="action === 'approve' ? 'success' : 'danger'"
        :loading="submitting"
        loading-text="Memproses..."
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
