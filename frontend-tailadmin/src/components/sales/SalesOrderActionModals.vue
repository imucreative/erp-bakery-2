<script setup lang="ts">
/**
 * SalesOrderActionModals — a single confirmation modal driven by `action`
 * ('void' | 'refund' | null). Void cancels an unpaid order; refund returns a
 * paid order and posts the stock reversal (full-order, final). Refund exposes an
 * optional reason. The parent runs the mutation and surfaces backend errors via
 * `errorMessage`, keeping the user on the page. Transparent backdrop per UI
 * standard.
 */
import { computed, ref, watch } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import BaseTextarea from '../ui/BaseTextarea.vue'
import BaseButton from '../ui/BaseButton.vue'

export type SalesOrderAction = 'void' | 'refund'

const props = withDefaults(
  defineProps<{
    action: SalesOrderAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', reason: string): void
}>()

const reason = ref<string>('')

watch(
  () => props.action,
  (next) => {
    if (next) {
      reason.value = ''
    }
  },
)

const isRefund = computed<boolean>(() => props.action === 'refund')

const title = computed<string>(() =>
  props.action === 'refund' ? 'Refund Sales Order' : 'Batalkan Sales Order',
)

const description = computed<string>(() =>
  props.action === 'refund'
    ? 'Refund mengembalikan seluruh stok yang dikonsumsi order ini dan menandai order sebagai Dikembalikan. Tindakan ini bersifat final. Alasan opsional.'
    : 'Batalkan order yang belum dibayar ini? Order akan ditandai sebagai Dibatalkan. Tindakan ini bersifat final.',
)

const confirmLabel = computed<string>(() =>
  props.action === 'refund' ? 'Refund & Kembalikan Stok' : 'Batalkan Order',
)

function onConfirm(): void {
  emit('confirm', reason.value.trim())
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
        v-if="isRefund"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Setelah refund, order tidak bisa dikembalikan ke status Dibayar.</span>
      </div>

      <div v-if="isRefund" class="mb-4">
        <label class="form-label"> Alasan </label>
        <BaseTextarea
          id="refund-sales-order-action-note"
          :model-value="reason"
          :rows="3"
          :placeholder="isRefund ? 'Alasan Refund...' : 'Alasan opsional...'"
          @update:model-value="reason = $event"
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
          variant="warning"
          :loading="submitting"
          loading-text="Memproses..."
          :disabled="submitting"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
