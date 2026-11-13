<script setup lang="ts">
/**
 * ProductTypeDeleteModal — delete confirmation for a product type. The backend
 * rejects deletion with 409 when the type is still referenced by products;
 * the parent surfaces that message and the user can deactivate via Edit instead.
 */
import { Trash2, X } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
import type { ProductTypeOption } from '@/services/product-type.service'

withDefaults(
  defineProps<{
    open: boolean
    productType?: ProductTypeOption | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { productType: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-2">Hapus Tipe Produk</h4>
    <p class="text-muted mb-5">
      Yakin menghapus "{{ productType?.name }}" ({{ productType?.code }})? Tipe yang masih
      digunakan produk tidak dapat dihapus — nonaktifkan lewat Edit jika tidak ingin dipakai lagi.
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
