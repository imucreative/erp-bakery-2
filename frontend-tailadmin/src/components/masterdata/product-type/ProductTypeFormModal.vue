<script setup lang="ts">
/**
 * ProductTypeFormModal — create/edit for a product-type reference row.
 * Code is immutable after create (it is stored on products). Emits `submit`;
 * the parent runs the mutation and controls submitting/error.
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
import type { ProductTypeOption } from '@/services/product-type.service'

const CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,49}$/

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    productType?: ProductTypeOption | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { productType: null, submitting: false, errorMessage: null },
)

interface ProductTypeFormPayload {
  code?: string
  name: string
  description: string
  isActive: boolean
}

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit', payload: ProductTypeFormPayload): void
}>()

const code = ref<string>('')
const name = ref<string>('')
const description = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.productType] as const,
  ([open]) => {
    if (open) {
      code.value = props.productType?.code ?? ''
      name.value = props.productType?.name ?? ''
      description.value = props.productType?.description ?? ''
      isActive.value = props.productType?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  const normalizedCode = code.value.trim().toUpperCase()
  const trimmedName = name.value.trim()

  if (props.mode === 'create') {
    if (normalizedCode.length === 0) {
      localError.value = 'Kode wajib diisi.'
      return
    }
    if (!CODE_PATTERN.test(normalizedCode)) {
      localError.value =
        'Kode harus diawali huruf dan hanya berisi huruf kapital, angka, atau underscore (maks. 50).'
      return
    }
  }
  if (trimmedName.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }

  localError.value = null
  emit('submit', {
    code: props.mode === 'create' ? normalizedCode : undefined,
    name: trimmedName,
    description: description.value.trim(),
    isActive: isActive.value,
  })
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit Tipe Produk' : 'Tambah Tipe Produk' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField
        label="Kode"
        field-id="product-type-code"
        required
        :error="
          localError && (mode === 'create' ? !code.trim() : false) ? localError : null
        "
      >
        <BaseInput
          v-if="mode === 'create'"
          id="product-type-code"
          v-model="code"
          placeholder="mis. FINISHED_GOODS"
          maxlength="50"
        />
        <p v-else class="form-readonly">{{ code }}</p>
      </BaseFormField>

      <BaseFormField
        label="Nama"
        field-id="product-type-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="product-type-name" v-model="name" placeholder="mis. Barang Jadi" />
      </BaseFormField>

      <BaseFormField label="Deskripsi" field-id="product-type-description">
        <BaseTextarea
          id="product-type-description"
          v-model="description"
          :rows="2"
          maxlength="500"
          placeholder="Deskripsi singkat (opsional)"
        />
      </BaseFormField>

      <BaseToggle v-model="isActive" label="Aktif" />

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
