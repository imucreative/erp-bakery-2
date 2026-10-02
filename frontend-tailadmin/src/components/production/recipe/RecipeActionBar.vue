<script setup lang="ts">
/**
 * RecipeActionBar — right-aligned group of lifecycle action buttons for a
 * Recipe detail view. Stateless: the parent view owns status, permissions, and
 * the submitting flag, and decides which actions are visible via the `show*`
 * props. This component only renders buttons and emits intents:
 *
 *   edit      → parent navigates to the edit page (DRAFT only)
 *   activate  → parent opens the activate confirmation modal (DRAFT → ACTIVE)
 *   archive   → parent opens the archive confirmation modal (DRAFT|ACTIVE → ARCHIVED)
 *   delete    → parent opens the delete confirmation modal (DRAFT|ARCHIVED, soft-delete)
 *   duplicate → parent copies an ARCHIVED recipe into a new create draft
 *
 * Every button carries a relevant icon (icon + text) per the UI standard. When
 * no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, CheckCircle2, Archive, Trash2, Copy } from 'lucide-vue-next'

const props = defineProps<{
  showEdit: boolean
  showActivate: boolean
  showArchive: boolean
  showDelete: boolean
  showDuplicate: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'activate'): void
  (e: 'archive'): void
  (e: 'delete'): void
  (e: 'duplicate'): void
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
      v-if="props.showActivate"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-success-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-success-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('activate')"
    >
      <CheckCircle2 class="h-4 w-4" aria-hidden="true" />
      Aktifkan
    </button>
    <button
      v-if="props.showArchive"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
      @click="emit('archive')"
    >
      <Archive class="h-4 w-4" aria-hidden="true" />
      Arsipkan
    </button>
    <button
      v-if="props.showDuplicate"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 dark:hover:bg-white/[0.03]"
      @click="emit('duplicate')"
    >
      <Copy class="h-4 w-4" aria-hidden="true" />
      Duplikat ke Draft
    </button>
    <button
      v-if="props.showDelete"
      type="button"
      :disabled="props.submitting"
      class="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
      @click="emit('delete')"
    >
      <Trash2 class="h-4 w-4" aria-hidden="true" />
      Hapus
    </button>
  </div>
</template>
