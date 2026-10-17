<script setup lang="ts">
/**
 * PurchaseOrderActionModals — a single confirmation modal driven by `action`
 * ('approve' | 'reject' | 'cancel' | null). Approve/cancel expose an optional
 * note; reject requires a note (validated locally before emitting `confirm`).
 * The parent runs the mutation and surfaces backend errors via `errorMessage`,
 * keeping the user on the page. Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseTextarea } from '@/components/ui'

export type PurchaseOrderAction = 'approve' | 'reject' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: PurchaseOrderAction | null
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
      return 'Setujui Purchase Order'
    case 'reject':
      return 'Tolak Purchase Order'
    case 'cancel':
      return 'Batalkan Purchase Order'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'approve':
      return 'Setujui PO ini? Anda dapat menambahkan catatan opsional.'
    case 'reject':
      return 'Tolak PO ini. Catatan wajib diisi untuk menjelaskan alasan penolakan.'
    case 'cancel':
      return 'Batalkan PO ini? Tindakan ini bersifat final. Catatan opsional.'
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
      return 'Batalkan PO'
    default:
      return 'Konfirmasi'
  }
})

function onConfirm(): void {
  const trimmed = note.value.trim()
  if (noteRequired.value && trimmed.length === 0) {
    localError.value = 'Catatan wajib diisi untuk menolak PO.'
    return
  }
  localError.value = null
  emit('confirm', trimmed)
}
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

      <div class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Catatan<span v-if="noteRequired" class="text-error-500">*</span>
        </label>
        <BaseTextarea
          id="purchase-order-action-note"
          :model-value="note"
          :rows="3"
          :placeholder="noteRequired ? 'Alasan penolakan...' : 'Catatan opsional...'"
          @update:model-value="note = $event"
        />
      </div>

      <p
        v-if="localError || errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ localError || errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
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
    </div>
  </div>
</template>
