<script setup lang="ts">
/**
 * SalesOrderActionBar — right-aligned group of lifecycle action buttons for a
 * Sales Order detail view. Stateless: the parent owns status, permissions, and
 * the submitting flag, and decides which actions are visible via the `show*`
 * props. This component only renders buttons and emits intents:
 *
 *   void   → parent opens the void confirmation modal (PENDING_PAYMENT only)
 *   refund → parent opens the refund confirmation modal (PAID only)
 */
import { Ban, RotateCcw } from 'lucide-vue-next'

const props = defineProps<{
  showVoid: boolean
  showRefund: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'void'): void
  (e: 'refund'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <button
      v-if="props.showVoid"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
      @click="emit('void')"
    >
      <Ban class="h-4 w-4" aria-hidden="true" />
      Batalkan
    </button>
    <button
      v-if="props.showRefund"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-warning-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-warning-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('refund')"
    >
      <RotateCcw class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      Refund
    </button>
  </div>
</template>
