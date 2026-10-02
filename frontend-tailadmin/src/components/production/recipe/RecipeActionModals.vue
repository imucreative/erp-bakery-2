<script setup lang="ts">
/**
 * RecipeActionModals — a single confirmation modal driven by `action`
 * ('activate' | 'archive' | 'delete' | null). The backend lifecycle/delete
 * endpoints take NO request body, so this modal is a plain confirmation with no
 * input — it only emits `confirm`. Activate explains the "one active recipe per
 * product" rule; archive explains it is terminal; delete is a destructive
 * soft-delete allowed for DRAFT or ARCHIVED (the backend rejects only ACTIVE
 * with 400 RECIPE.ACTIVE_NOT_DELETABLE). The parent runs the mutation and
 * surfaces backend errors via `errorMessage` (notably the 409 "another active
 * recipe exists" clash on activate, or 400/404 on delete), keeping the user on the
 * page. Transparent backdrop + rounded-3xl panel per the UI standard.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'

export type RecipeAction = 'activate' | 'archive' | 'delete'

const props = withDefaults(
  defineProps<{
    action: RecipeAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()

// Both archive and delete are destructive/irreversible → show the warning note.
const isDestructive = computed<boolean>(
  () => props.action === 'archive' || props.action === 'delete',
)

const title = computed<string>(() => {
  switch (props.action) {
    case 'activate':
      return 'Aktifkan Resep'
    case 'archive':
      return 'Arsipkan Resep'
    case 'delete':
      return 'Hapus Resep'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'activate':
      return 'Aktifkan resep ini? Hanya boleh ada satu resep aktif per produk jadi. Resep aktif tidak dapat diedit; untuk versi baru, arsipkan dulu lalu buat resep baru.'
    case 'archive':
      return 'Arsipkan resep ini? Resep yang diarsipkan bersifat final dan tidak dapat diaktifkan kembali.'
    case 'delete':
      return 'Hapus resep ini? Resep yang dihapus akan dikeluarkan dari daftar. Resep berstatus Draft atau Arsip dapat dihapus; resep Aktif tidak dapat dihapus.'
    default:
      return ''
  }
})

const warningText = computed<string>(() =>
  props.action === 'delete'
    ? 'Resep yang dihapus tidak dapat dikembalikan dari daftar.'
    : 'Resep yang diarsipkan tidak dapat dikembalikan.',
)

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'activate':
      return 'Aktifkan'
    case 'archive':
      return 'Arsipkan'
    case 'delete':
      return 'Hapus'
    default:
      return 'Konfirmasi'
  }
})

const confirmClass = computed<string>(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-60'
  if (isDestructive.value) {
    return `${base} bg-error-500 hover:bg-error-600`
  }
  return `${base} bg-success-500 hover:bg-success-600`
})
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
        v-if="isDestructive"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ warningText }}</span>
      </div>

      <p
        v-if="errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
          Kembali
        </Button>
        <button type="button" :disabled="submitting" :class="confirmClass" @click="emit('confirm')">
          {{ submitting ? 'Memproses...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
