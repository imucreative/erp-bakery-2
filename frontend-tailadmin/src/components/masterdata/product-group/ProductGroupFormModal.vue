<script setup lang="ts">
/**
 * ProductGroupFormModal — create/edit modal (name + description + active toggle
 * on edit). Self-contained form state; emits `submit`. Transparent backdrop.
 */
import { ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
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
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
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
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nama<span class="text-error-500">*</span>
          </label>
          <input
            v-model="name"
            type="text"
            placeholder="mis. Bahan Baku"
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Deskripsi
          </label>
          <textarea
            v-model="description"
            rows="2"
            placeholder="Deskripsi singkat (opsional)"
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

        <ToggleSwitch v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ localError || errorMessage }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
            Batal
          </Button>
          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
