<script setup lang="ts">
/**
 * UserDeleteModal — delete confirmation. Emits `confirm`; parent runs the
 * mutation. Backdrop, Esc-close, and panel chrome come from BaseModal.
 */
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import { Trash2, X } from 'lucide-vue-next'
import type { User } from '@/services/user.service'

withDefaults(
  defineProps<{
    open: boolean
    user?: User | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { user: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-2">Hapus User</h4>
    <p class="text-muted mb-5">
      Yakin menghapus "{{ user?.name }}" ({{ user?.email }})? Tindakan ini tidak dapat dibatalkan.
    </p>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="flex justify-end gap-3">
      <BaseButton size="sm" variant="outline" :disabled="deleting" @click="emit('close')">
        <template #start-icon><X class="h-4 w-4" aria-hidden="true" /></template>
        Batal
      </BaseButton>
      <BaseButton
        variant="danger"
        :loading="deleting"
        loading-text="Menghapus..."
        @click="emit('confirm')"
      >
        <template #start-icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>
        Hapus
      </BaseButton>
    </div>
  </BaseModal>
</template>
