<script setup lang="ts">
/**
 * ProductionOrderActionBar — right-aligned group of lifecycle action buttons for
 * a Production Order detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props (mirroring canTransition). This component only renders
 * buttons and emits intents:
 *
 *   start  → parent opens the start confirmation modal (SCHEDULED → IN_PROGRESS)
 *   yield  → parent opens the record-yield modal (IN_PROGRESS → YIELD_COMPLETED)
 *   qa     → parent opens the QA modal (YIELD_COMPLETED → QA_PASSED|QA_FAILED)
 *   complete → parent opens the complete modal (QA_* → COMPLETED, backflushing)
 *   cancel → parent opens the cancel confirmation modal (SCHEDULED → CANCELLED)
 *
 * Every button carries a relevant icon (icon + text) per the UI standard. When
 * no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Play, ClipboardCheck, ShieldCheck, PackageCheck, Ban } from 'lucide-vue-next'

const props = defineProps<{
  showStart: boolean
  showYield: boolean
  showQa: boolean
  showComplete: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'yield'): void
  (e: 'qa'): void
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
      Mulai Produksi
    </button>
    <button
      v-if="props.showYield"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('yield')"
    >
      <ClipboardCheck class="h-4 w-4" aria-hidden="true" />
      Catat Hasil
    </button>
    <button
      v-if="props.showQa"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('qa')"
    >
      <ShieldCheck class="h-4 w-4" aria-hidden="true" />
      Cek QA
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
