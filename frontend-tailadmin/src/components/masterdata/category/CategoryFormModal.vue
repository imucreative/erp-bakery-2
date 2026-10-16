<script setup lang="ts">
/**
 * CategoryFormModal — create/edit modal for a category. On CREATE the parent
 * product group is required (native styled select). On EDIT the group is shown
 * read-only (backend PUT does not change the group) plus an active toggle.
 * Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import { BaseFormField, BaseInput, BaseSelect, BaseTextarea, BaseToggle } from '@/components/ui'
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
          <p
            v-else
            class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300"
          >
            {{ currentGroupName }}
          </p>
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

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ localError || errorMessage }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button
            size="sm"
            variant="outline"
            :disabled="submitting"
            :on-click="() => emit('close')"
          >
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
