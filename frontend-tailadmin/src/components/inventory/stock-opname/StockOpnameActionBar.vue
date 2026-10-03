<script setup lang="ts">
/**
 * StockOpnameActionBar — right-aligned group of lifecycle action buttons for a
 * Stock Opname detail view. Stateless: the parent view owns status, permissions,
 * and the submitting flag, and decides which actions are visible via the `show*`
 * props. This component only renders buttons and emits intents:
 *
 *   start    → DRAFT → COUNTING (snapshots batches)       (.create)
 *   submit   → COUNTING → SUBMITTED                        (.update)
 *   approve  → SUBMITTED → APPROVED                        (.approve)
 *   complete → APPROVED → COMPLETED (posts stock, final)   (.complete)
 *   cancel   → DRAFT|COUNTING|SUBMITTED → CANCELLED        (.update)
 *
 * Every button carries a relevant icon (icon + text) per the UI standard. When
 * no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Play, Send, CheckCheck, PackageCheck, Ban } from 'lucide-vue-next'

const props = defineProps<{
  showStart: boolean
  showSubmit: boolean
  showApprove: boolean
  showComplete: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'submit'): void
  (e: 'approve'): void
  (e: 'complete'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <button
      v-if="props.showStart"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('start')"
    >
      <Play class="h-4 w-4" aria-hidden="true" />
      Mulai Penghitungan
    </button>
    <button
      v-if="props.showSubmit"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('submit')"
    >
      <Send class="h-4 w-4" aria-hidden="true" />
      Ajukan
    </button>
    <button
      v-if="props.showApprove"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('approve')"
    >
      <CheckCheck class="h-4 w-4" aria-hidden="true" />
      Setujui
    </button>
    <button
      v-if="props.showComplete"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-success-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('complete')"
    >
      <PackageCheck class="h-4 w-4" aria-hidden="true" />
      Selesaikan
    </button>
    <button
      v-if="props.showCancel"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
      @click="emit('cancel')"
    >
      <Ban class="h-4 w-4" aria-hidden="true" />
      Batalkan
    </button>
  </div>
</template>
