<script setup lang="ts">
/**
 * OutletFormModal — create/edit modal for an outlet (name, address, phone +
 * active toggle on edit). On create, `code` may be typed manually (optional —
 * the backend generates OUT-### when left blank and stores it uppercase); on
 * edit the code is immutable and shown read-only. Self-contained form state;
 * emits `submit` and lets the parent run the mutation. Transparent backdrop
 * per UI standard.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import { BaseButton, BaseFormField, BaseInput, BaseTextarea, BaseToggle } from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    outlet?: Outlet | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { outlet: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: { code?: string; name: string; address: string; phone: string; isActive: boolean },
  ): void
}>()

const code = ref<string>('')
const name = ref<string>('')
const address = ref<string>('')
const phone = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.outlet] as const,
  ([open]) => {
    if (open) {
      code.value = ''
      name.value = props.outlet?.name ?? ''
      address.value = props.outlet?.address ?? ''
      phone.value = props.outlet?.phone ?? ''
      isActive.value = props.outlet?.isActive ?? true
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
  // Blank → omit so the backend generates OUT-###. The backend also uppercases.
  const trimmedCode = code.value.trim()
  emit('submit', {
    code: trimmedCode.length > 0 ? trimmedCode : undefined,
    name: trimmed,
    address: address.value.trim(),
    phone: phone.value.trim(),
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
      class="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ mode === 'edit' ? 'Edit Outlet' : 'Tambah Outlet' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div v-if="mode === 'edit' && outlet?.code">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Kode
          </label>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ outlet.code }}</p>
        </div>

        <BaseFormField
          v-if="mode === 'create'"
          label="Kode"
          field-id="outlet-code"
          hint="Opsional — kosongkan untuk kode otomatis (OUT-001). Disimpan dalam huruf kapital."
        >
          <BaseInput
            id="outlet-code"
            v-model="code"
            class="uppercase"
            maxlength="20"
            placeholder="mis. OUT-BDG-01"
          />
        </BaseFormField>

        <BaseFormField
          label="Nama"
          field-id="outlet-name"
          required
          :error="localError && !name.trim() ? localError : null"
        >
          <BaseInput id="outlet-name" v-model="name" placeholder="mis. Outlet Bandung" />
        </BaseFormField>

        <BaseFormField label="Telepon" field-id="outlet-phone">
          <BaseInput id="outlet-phone" v-model="phone" placeholder="021-555-0100" type="tel" />
        </BaseFormField>

        <BaseFormField label="Alamat" field-id="outlet-address">
          <BaseTextarea
            id="outlet-address"
            v-model="address"
            :rows="2"
            placeholder="Alamat outlet"
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
