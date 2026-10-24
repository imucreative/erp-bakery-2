<script setup lang="ts">
/**
 * ProductGroupFormModal — create/edit modal (name + description + active toggle
 * on edit). Self-contained form state; emits `submit`. Backdrop, Esc-close, and
 * panel chrome come from BaseModal.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseTextarea,
  BaseToggle,
} from '@/components/ui'
import type { ProductGroup } from '@/services/product-group.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    group?: ProductGroup | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { group: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: { name: string; description: string; isActive: boolean }): void
}>()

const name = ref<string>('')
const description = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.group] as const,
  ([open]) => {
    if (open) {
      name.value = props.group?.name ?? ''
      description.value = props.group?.description ?? ''
      isActive.value = props.group?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  localError.value = null
  emit('submit', {
    name: trimmed,
    description: description.value.trim(),
    isActive: isActive.value,
  })
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit Grup Produk' : 'Tambah Grup Produk' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField
        label="Nama"
        field-id="product-group-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="product-group-name" v-model="name" placeholder="mis. Bahan Baku" />
      </BaseFormField>

      <BaseFormField label="Deskripsi" field-id="product-group-description">
        <BaseTextarea
          id="product-group-description"
          v-model="description"
          :rows="2"
          placeholder="Deskripsi singkat (opsional)"
        />
      </BaseFormField>

      <BaseToggle v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          <template #start-icon>
            <X class="h-4 w-4" aria-hidden="true" />
          </template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon>
            <Save class="h-4 w-4" aria-hidden="true" />
          </template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
