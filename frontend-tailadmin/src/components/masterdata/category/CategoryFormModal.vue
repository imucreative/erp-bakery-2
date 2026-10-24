<script setup lang="ts">
/**
 * CategoryFormModal — create/edit modal for a category. On CREATE the parent
 * product group is required (native styled select). On EDIT the group is shown
 * read-only (backend PUT does not change the group) plus an active toggle.
 * Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTextarea,
  BaseToggle,
} from '@/components/ui'
import type { Category } from '@/services/category.service'
import type { ProductGroup } from '@/services/product-group.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    category?: Category | null
    groups: ProductGroup[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { category: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: { productGroupId: string; name: string; description: string; isActive: boolean },
  ): void
}>()

const productGroupId = ref<string>('')
const name = ref<string>('')
const description = ref<string>('')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

const isEdit = computed<boolean>(() => props.mode === 'edit')
const groupOptions = computed(() =>
  props.groups.map((group) => ({ label: group.name, value: group.id })),
)

const currentGroupName = computed<string>(() => {
  const id = props.category?.productGroupId
  if (!id) {
    return '—'
  }
  return props.groups.find((g) => g.id === id)?.name ?? id
})

watch(
  () => [props.open, props.category] as const,
  ([open]) => {
    if (open) {
      productGroupId.value = props.category?.productGroupId ?? ''
      name.value = props.category?.name ?? ''
      description.value = props.category?.description ?? ''
      isActive.value = props.category?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

function onSubmit(): void {
  const trimmed = name.value.trim()
  if (!isEdit.value && productGroupId.value.length === 0) {
    localError.value = 'Grup produk wajib dipilih.'
    return
  }
  if (trimmed.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  localError.value = null
  emit('submit', {
    productGroupId: productGroupId.value,
    name: trimmed,
    description: description.value.trim(),
    isActive: isActive.value,
  })
}
</script>

<template>
  <BaseModal :open="open" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit Kategori' : 'Tambah Kategori' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <!-- Product group: selectable on create, read-only on edit -->
      <BaseFormField
        label="Grup Produk"
        field-id="category-product-group"
        :required="!isEdit"
        :error="!isEdit && localError && !productGroupId ? localError : null"
      >
        <BaseSelect
          v-if="!isEdit"
          id="category-product-group"
          v-model="productGroupId"
          :options="groupOptions"
          placeholder="Pilih grup produk"
        />
        <p v-else class="form-readonly">{{ currentGroupName }}</p>
      </BaseFormField>

      <BaseFormField
        label="Nama"
        field-id="category-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="category-name" v-model="name" placeholder="mis. Roti Manis" />
      </BaseFormField>

      <BaseFormField label="Deskripsi" field-id="category-description">
        <BaseTextarea
          id="category-description"
          v-model="description"
          :rows="2"
          placeholder="Deskripsi singkat (opsional)"
        />
      </BaseFormField>

      <BaseToggle v-if="isEdit" v-model="isActive" label="Aktif" />

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
          size="sm"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
          :disabled="submitting"
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
