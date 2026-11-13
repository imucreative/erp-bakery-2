<script setup lang="ts">
/**
 * UomDimensionDeletePanel — confirmation view inside the Kelola Dimensi drawer.
 * Explains the 409 rule (a dimension still used by UOMs cannot be deleted) and
 * suggests deactivation instead. Presentation only; the drawer deletes.
 */
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import { BaseAlert, BaseButton } from '@/components/ui'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

defineProps<{
  dimension: UomDimensionDefinition | null
  deleting: boolean
  errorMessage: string | null
}>()

const emit = defineEmits<{
  (event: 'cancel'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <p class="text-muted mb-4">
    Yakin menghapus dimensi "{{ dimension?.name }}" ({{ dimension?.code }}) beserta satuan kanonik
    "{{ dimension?.canonicalUnitName }}"? Dimensi yang masih dipakai UOM tidak dapat dihapus —
    nonaktifkan lewat Edit jika tidak ingin dipakai lagi.
  </p>

  <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

  <div class="button-row">
    <BaseButton size="sm" variant="outline" :disabled="deleting" @click="emit('cancel')">
      <template #start-icon>
        <ArrowLeft class="h-4 w-4" aria-hidden="true" />
      </template>
      Kembali
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
</template>
