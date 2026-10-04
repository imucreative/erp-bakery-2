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
import Button from '@/components/ui/Button.vue'

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

const confirmClass = computed<string>(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-60'
  if (props.action === 'refund') {
    return `${base} bg-warning-500 hover:bg-warning-600`
  }
  return `${base} bg-error-500 hover:bg-error-600`
})

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
      <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h4>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">{{ description }}</p>

      <div
        v-if="isRefund"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Setelah refund, order tidak bisa dikembalikan ke status Dibayar.</span>
      </div>

      <div v-if="isRefund" class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Alasan
        </label>
        <textarea
          v-model="reason"
          rows="3"
          placeholder="Alasan opsional..."
          class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        ></textarea>
      </div>

      <p
        v-if="errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
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
