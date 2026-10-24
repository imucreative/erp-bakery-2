<script setup lang="ts">
/**
 * UomFormModal — create/edit modal for a UOM. Self-contained form state; emits
 * `submit` with the payload and lets the parent run the mutation (controls
 * `submitting` + `errorMessage`). Backdrop, Esc-close, and panel chrome come
 * from BaseModal.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseToggle,
} from '@/components/ui'
import type { Uom } from '@/services/uom.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    uom?: Uom | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { uom: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: { name: string; isActive: boolean }): void
}>()

const name = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

// Re-seed the form whenever the modal opens (or the target UOM changes).
watch(
  () => [props.open, props.uom] as const,
  ([open]) => {
    if (open) {
      name.value = props.uom?.name ?? ''
      isActive.value = props.uom?.isActive ?? true
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
  emit('submit', { name: trimmed, isActive: isActive.value })
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit UOM' : 'Tambah UOM' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField
        label="Nama"
        field-id="uom-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="uom-name" v-model="name" placeholder="mis. PCS, KG, LITER" />
      </BaseFormField>

      <BaseToggle v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="button-row pt-2">
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
