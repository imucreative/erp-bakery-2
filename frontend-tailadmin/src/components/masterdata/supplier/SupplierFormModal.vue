<script setup lang="ts">
/**
 * SupplierFormModal — create/edit modal for a supplier (name, address, phone,
 * PIC + active toggle on edit). Self-contained form state; emits `submit` and
 * lets the parent run the mutation. Transparent backdrop per UI standard.
 */
import { ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import type { Supplier } from '@/services/supplier.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    supplier?: Supplier | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { supplier: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: { name: string; address: string; phone: string; picName: string; isActive: boolean },
  ): void
}>()

const name = ref<string>('')
const address = ref<string>('')
const phone = ref<string>('')
const picName = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.supplier] as const,
  ([open]) => {
    if (open) {
      name.value = props.supplier?.name ?? ''
      address.value = props.supplier?.address ?? ''
      phone.value = props.supplier?.phone ?? ''
      picName.value = props.supplier?.picName ?? ''
      isActive.value = props.supplier?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

function onSubmit(): void {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  localError.value = null
  emit('submit', {
    name: trimmed,
    address: address.value.trim(),
    phone: phone.value.trim(),
    picName: picName.value.trim(),
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
      class="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ mode === 'edit' ? 'Edit Supplier' : 'Tambah Supplier' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nama<span class="text-error-500">*</span>
          </label>
          <input v-model="name" type="text" placeholder="mis. PT Tepung Sejahtera" :class="inputClass" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              PIC
            </label>
            <input v-model="picName" type="text" placeholder="Nama penanggung jawab" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
              Telepon
            </label>
            <input v-model="phone" type="text" placeholder="021-555-0200" :class="inputClass" />
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Alamat
          </label>
          <textarea
            v-model="address"
            rows="2"
            placeholder="Alamat supplier"
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

        <label
          v-if="mode === 'edit'"
          class="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-400"
        >
          <input v-model="isActive" type="checkbox" class="h-4 w-4 rounded" />
          Aktif
        </label>

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
