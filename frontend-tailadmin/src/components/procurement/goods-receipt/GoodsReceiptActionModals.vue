<script setup lang="ts">
/**
 * GoodsReceiptActionModals — a single confirmation modal driven by `action`
 * ('complete' | 'cancel' | null). Both expose an optional note. Complete
 * explicitly warns the user that it posts stock to inventory and cannot be
 * undone. The parent runs the mutation and surfaces backend errors via
 * `errorMessage`, keeping the user on the page. Transparent backdrop per UI
 * standard.
 */
import { computed, ref, watch } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseButton, BaseTextarea } from '@/components/ui'

export type GoodsReceiptAction = 'complete' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: GoodsReceiptAction | null
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

watch(
  () => props.action,
  (next) => {
    if (next) {
      note.value = ''
    }
  },
)

const isComplete = computed<boolean>(() => props.action === 'complete')

const title = computed<string>(() => {
  switch (props.action) {
    case 'complete':
      return 'Selesaikan Goods Receipt'
    case 'cancel':
      return 'Batalkan Goods Receipt'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'complete':
      return 'Menyelesaikan GR ini akan memposting stok yang diterima ke inventory. Tindakan ini bersifat final dan tidak dapat dibatalkan. Catatan opsional.'
    case 'cancel':
      return 'Batalkan GR ini? Tindakan ini bersifat final. Catatan opsional.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'complete':
      return 'Selesaikan & Posting Stok'
    case 'cancel':
      return 'Batalkan GR'
    default:
      return 'Konfirmasi'
  }
})

function onConfirm(): void {
  emit('confirm', note.value.trim())
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
      <h4 class="modal-title mb-2">{{ title }}</h4>
      <p class="text-muted mb-4">{{ description }}</p>

      <div
        v-if="isComplete"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Setelah selesai, GR tidak bisa diedit atau dibatalkan.</span>
      </div>

      <div class="mb-4">
        <label class="form-label"> Catatan </label>
        <BaseTextarea
          id="goods-receipt-action-note"
          :model-value="note"
          :rows="3"
          placeholder="Catatan opsional..."
          @update:model-value="note = $event"
        />
      </div>

      <p v-if="errorMessage" class="alert-error mb-4 px-3 py-2">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          Batal
        </BaseButton>
        <BaseButton
          type="button"
          :variant="action === 'complete' ? 'success' : 'danger'"
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
