<script setup lang="ts">
/**
 * UomDimensionDeleteModal — delete confirmation for a UOM dimension. The
 * backend rejects deletion with 409 while any UOM still uses the dimension;
 * the parent surfaces that message and the user can deactivate via Edit.
 */
import { Trash2, X } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

withDefaults(
  defineProps<{
    open: boolean
    dimension?: UomDimensionDefinition | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { dimension: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-2">Hapus Dimensi UOM</h4>
    <p class="text-muted mb-5">
      Yakin menghapus dimensi "{{ dimension?.name }}" ({{ dimension?.code }}) beserta satuan kanonik
      "{{ dimension?.canonicalUnitName }}"? Dimensi yang masih dipakai UOM tidak dapat dihapus —
      nonaktifkan lewat Edit jika tidak ingin dipakai lagi.
    </p>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
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
