<script setup lang="ts">
/**
 * Confirmation modal for recipe lifecycle actions (activate/archive/delete).
 * Backdrop, panel, Esc-close, and backdrop-click close come from `BaseModal`
 * (`size="md"`); the destructive warning and the backend error are `BaseAlert`
 * banners.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'

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
  <BaseModal :open="Boolean(action)" @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-4">{{ description }}</p>

    <BaseAlert v-if="isDestructive" variant="warning" size="sm" class="mb-4 dark:text-orange-400">
      <span class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{{ warningText }}</span>
      </span>
    </BaseAlert>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
        Kembali
      </BaseButton>
      <BaseButton
        size="sm"
        :variant="confirmVariant"
        :disabled="submitting"
        :loading="submitting"
        loading-text="Memproses..."
        @click="emit('confirm')"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
