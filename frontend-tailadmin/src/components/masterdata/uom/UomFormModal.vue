<script setup lang="ts">
/**
 * UomFormModal — create/edit modal for a UOM. Self-contained form state; emits
 * `submit` with the payload and lets the parent run the mutation (controls
 * `submitting` + `errorMessage`). Backdrop is intentionally light/transparent.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import { BaseButton, BaseFormField, BaseInput, BaseToggle } from '@/components/ui'
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
  <div
    v-if="open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <!-- Transparent backdrop (light dim, subtle blur) -->
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <!-- Panel -->
    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
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

        <p v-if="localError || errorMessage" class="alert-error px-3 py-2">
          {{ localError || errorMessage }}
        </p>

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
    </div>
  </div>
</template>
