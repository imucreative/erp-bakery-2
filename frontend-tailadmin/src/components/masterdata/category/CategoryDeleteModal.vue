<script setup lang="ts">
/**
 * CategoryDeleteModal — delete confirmation. Emits `confirm`; parent runs the
 * mutation. Transparent backdrop per UI standard.
 */
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
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
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-2">Hapus Kategori</h4>
    <p class="text-muted mb-5">
      Yakin menghapus "{{ category?.name }}"? Tindakan ini tidak dapat dibatalkan.
    </p>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

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
  </BaseModal>
</template>
