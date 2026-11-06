<script setup lang="ts">
/**
 * PlatformUserDeleteModal — confirmation dialog for soft-deleting a platform
 * user. The parent owns the mutation and controls deleting/error state.
 */
import { Trash2, X } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import type { PlatformUserItem } from '@/services/platform.service'

withDefaults(
  defineProps<{
    open: boolean
    user?: PlatformUserItem | null
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
      Yakin menghapus user "{{ user?.name }}"? User akan dinonaktifkan dan tidak dapat login lagi.
    </p>

    <BaseAlert 
      :message="errorMessage" 
      size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton 
        size="sm" 
        variant="outline" 
        :disabled="deleting" 
        @click="emit('close')">
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
