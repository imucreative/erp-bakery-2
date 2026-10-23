<script setup lang="ts">
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

export type RecipeAction = 'activate' | 'archive' | 'delete'
const props = withDefaults(
  defineProps<{
    action: RecipeAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)
const emit = defineEmits<{ (event: 'close'): void; (event: 'confirm'): void }>()
const isDestructive = computed(() => props.action === 'archive' || props.action === 'delete')
const title = computed(() =>
  props.action === 'activate'
    ? 'Aktifkan Resep'
    : props.action === 'archive'
      ? 'Arsipkan Resep'
      : props.action === 'delete'
        ? 'Hapus Resep'
        : '',
)
const description = computed(() =>
  props.action === 'activate'
    ? 'Aktifkan resep ini? Hanya boleh ada satu resep aktif per produk jadi. Resep aktif tidak dapat diedit; untuk versi baru, arsipkan dulu lalu buat resep baru.'
    : props.action === 'archive'
      ? 'Arsipkan resep ini? Resep yang diarsipkan bersifat final dan tidak dapat diaktifkan kembali.'
      : props.action === 'delete'
        ? 'Hapus resep ini? Resep yang dihapus akan dikeluarkan dari daftar. Resep Draft atau Arsip dapat dihapus; resep Aktif tidak dapat dihapus.'
        : '',
)
const warningText = computed(() =>
  props.action === 'delete'
    ? 'Resep yang dihapus tidak dapat dikembalikan dari daftar.'
    : 'Resep yang diarsipkan tidak dapat dikembalikan.',
)
const confirmLabel = computed(() =>
  props.action === 'activate'
    ? 'Aktifkan'
    : props.action === 'archive'
      ? 'Arsipkan'
      : props.action === 'delete'
        ? 'Hapus'
        : 'Konfirmasi',
)
const confirmVariant = computed<'success' | 'danger'>(() =>
  isDestructive.value ? 'danger' : 'success',
)
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
    />
    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="modal-title mb-2">{{ title }}</h4>
      <p class="text-muted mb-4">{{ description }}</p>
      <div
        v-if="isDestructive"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>{{
          warningText
        }}</span>
      </div>
      <p v-if="errorMessage" class="alert-error mb-4 px-3 py-2">
        {{ errorMessage }}
      </p>
      <div class="flex justify-end gap-3">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')"
          >Kembali</BaseButton
        >
        <BaseButton
          size="sm"
          :variant="confirmVariant"
          :disabled="submitting"
          :loading="submitting"
          loading-text="Memproses..."
          @click="emit('confirm')"
          >{{ confirmLabel }}</BaseButton
        >
      </div>
    </div>
  </div>
</template>
