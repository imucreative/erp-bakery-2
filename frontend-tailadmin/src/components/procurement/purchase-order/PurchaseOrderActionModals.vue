<script setup lang="ts">
/**
 * PurchaseOrderActionModals — a single confirmation modal driven by `action`
 * ('approve' | 'reject' | 'cancel' | null). Approve/cancel expose an optional
 * note; reject requires a note (validated locally before emitting `confirm`).
 * The parent runs the mutation and surfaces backend errors via `errorMessage`,
 * keeping the user on the page. Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'

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

const confirmClass = computed<string>(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-60'
  if (props.action === 'approve') {
    return `${base} bg-success-500 hover:bg-success-600`
  }
  return `${base} bg-error-500 hover:bg-error-600`
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
        <textarea
          v-model="note"
          rows="3"
          :placeholder="noteRequired ? 'Alasan penolakan...' : 'Catatan opsional...'"
          class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        ></textarea>
      </div>

      <p
        v-if="localError || errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ localError || errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
          Batal
        </Button>
        <button type="button" :disabled="submitting" :class="confirmClass" @click="onConfirm">
          {{ submitting ? 'Memproses...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
