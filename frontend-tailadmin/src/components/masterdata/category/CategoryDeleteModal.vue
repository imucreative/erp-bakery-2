<script setup lang="ts">
/**
 * CategoryDeleteModal — delete confirmation. Emits `confirm`; parent runs the
 * mutation. Transparent backdrop per UI standard.
 */
import { BaseButton } from '@/components/ui'
import { Trash2, X } from 'lucide-vue-next'
import type { Category } from '@/services/category.service'

withDefaults(
  defineProps<{
    open: boolean
    category?: Category | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { category: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <div
    v-if="open"
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
      <h4 class="modal-title mb-2">Hapus Kategori</h4>
      <p class="text-muted mb-5">
        Yakin menghapus "{{ category?.name }}"? Tindakan ini tidak dapat dibatalkan.
      </p>

      <p v-if="errorMessage" class="alert-error mb-4 px-3 py-2">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <BaseButton size="sm" variant="outline" :disabled="deleting" @click="emit('close')">
          <template #start-icon>
            <X class="h-4 w-4" aria-hidden="true" />
          </template>
          Batal
        </BaseButton>
        <BaseButton
          variant="danger"
          :disabled="deleting"
          :loading="deleting"
          loading-text="Menghapus..."
          @click="emit('confirm')"
        >
          <template #start-icon>
            <Trash2 class="h-4 w-4" aria-hidden="true" />
          </template>
          Hapus
        </BaseButton>
      </div>
    </div>
  </div>
</template>
