<script setup lang="ts">
/**
 * RoleDeleteModal — delete confirmation for a role (ADR 49). Emits `confirm`;
 * parent runs the mutation. Surfaces backend 409 messages (OWNER cannot be
 * deleted / role in use by users). Backdrop, Esc-close, and panel chrome come
 * from BaseModal.
 */
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import { Trash2, X } from 'lucide-vue-next'
import type { Role } from '@/services/role.service'

withDefaults(
  defineProps<{
    open: boolean
    role?: Role | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { role: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-2">Hapus Role</h4>
    <p class="text-muted mb-5">
      Yakin menghapus role "{{ role?.name }}"? Tindakan ini tidak dapat dibatalkan.
    </p>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
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
