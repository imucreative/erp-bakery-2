<script setup lang="ts">
/**
 * ProductGroupFormModal — create/edit modal (name + description + active toggle
 * on edit). Self-contained form state; emits `submit`. Transparent backdrop.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import { BaseButton, BaseFormField, BaseInput, BaseTextarea, BaseToggle } from '@/components/ui'
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
  <div
    v-if="open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
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

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
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
