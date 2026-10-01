<script setup lang="ts">
/**
 * PurchaseOrderActionBar — right-aligned group of lifecycle action buttons for
 * a Purchase Order detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props. This component only renders buttons and emits intents:
 *
 *   edit    → parent navigates to the edit page
 *   submit  → parent submits the DRAFT (inline, no modal)
 *   approve → parent opens the approve confirmation modal
 *   reject  → parent opens the reject confirmation modal
 *   cancel  → parent opens the cancel confirmation modal
 *
 * When no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, Send, Check, X, Ban } from 'lucide-vue-next'

const props = defineProps<{
  showEdit: boolean
  showSubmit: boolean
  showApprove: boolean
  showReject: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'submit'): void
  (e: 'approve'): void
  (e: 'reject'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <button
      v-if="props.showEdit"
      type="button"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
      @click="emit('edit')"
    >
      <Pencil class="h-4 w-4" aria-hidden="true" />
      Edit
    </button>
    <button
      v-if="props.showSubmit"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('submit')"
    >
      <Send class="h-4 w-4" aria-hidden="true" />
      {{ props.submitting ? 'Memproses...' : 'Ajukan' }}
    </button>
    <button
      v-if="props.showApprove"
      type="button"
      class="inline-flex items-center gap-2 rounded-lg bg-success-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-success-600"
      @click="emit('approve')"
    >
      <Check class="h-4 w-4" aria-hidden="true" />
      Setujui
    </button>
    <button
      v-if="props.showReject"
      type="button"
      class="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600"
      @click="emit('reject')"
    >
      <X class="h-4 w-4" aria-hidden="true" />
      Tolak
    </button>
    <button
      v-if="props.showCancel"
      type="button"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
      @click="emit('cancel')"
    >
      <Ban class="h-4 w-4" aria-hidden="true" />
      Batalkan
    </button>
  </div>
</template>
