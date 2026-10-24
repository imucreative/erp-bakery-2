<script setup lang="ts">
/**
 * ToppingFormModal — create/edit modal for a GLOBAL topping.
 *
 * CREATE: pilih produk topping (RAW_MATERIAL / SEMI_FINISHED, hanya yang belum
 *   jadi topping) + takaran per item (defaultQtyPerItem > 0) + harga tambahan
 *   (extraPrice >= 0) + toggle aktif.
 * EDIT: produk topping read-only (tidak diubah backend); editable: takaran,
 *   harga tambahan, dan status aktif.
 *
 * Self-contained form state; emits `submit-create` / `submit-edit` with the
 * payload and lets the parent run the mutation (controls `submitting` +
 * `errorMessage`). Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseToggle,
} from '@/components/ui'
import { Save, X } from 'lucide-vue-next'
import type { Topping } from '@/services/topping.service'
import type { Product } from '@/services/product.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    topping?: Topping | null
    productOptions: Product[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { topping: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit-create', payload: CreatePayload): void
  (event: 'submit-edit', payload: EditPayload): void
}>()

interface CreatePayload {
  toppingProductId: string
  defaultQtyPerItem: number
  extraPrice: number
  isActive: boolean
}
interface EditPayload {
  defaultQtyPerItem: number
  extraPrice: number
  isActive: boolean
}

const isEdit = computed<boolean>(() => props.mode === 'edit')

const toppingProductId = ref<string>('')
const defaultQtyPerItem = ref<number>(1)
const extraPrice = ref<number>(0)
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

const defaultUomName = computed<string>(() => {
  const selectedProduct = props.productOptions.find(
    (product) => product.id === toppingProductId.value,
  )
  if (selectedProduct?.uomName) {
    return selectedProduct.uomName
  }
  if (props.topping?.toppingProductId === toppingProductId.value && props.topping.uomName) {
    return props.topping.uomName
  }
  return '—'
})

watch(
  () => [props.open, props.topping] as const,
  ([open]) => {
    if (open) {
      const t = props.topping
      toppingProductId.value = t?.toppingProductId ?? ''
      defaultQtyPerItem.value = t?.defaultQtyPerItem ?? 1
      extraPrice.value = t?.extraPrice ?? 0
      isActive.value = t?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

const productSelectOptions = computed(() =>
  props.productOptions.map((product) => ({
    label: `${product.name} (${product.sku})`,
    value: product.id,
  })),
)

function productLabel(id: string): string {
  const match = props.productOptions.find((p) => p.id === id)
  if (match) {
    return `${match.name} (${match.sku})`
  }
  // Edit mode: the topping's own name is the reliable label.
  return props.topping?.toppingName ?? id
}

function onSubmit(): void {
  const qty = Number(defaultQtyPerItem.value)
  const price = Number(extraPrice.value)
  if (!Number.isFinite(qty) || qty <= 0) {
    localError.value = 'Takaran per item harus lebih dari 0.'
    return
  }
  if (!Number.isFinite(price) || price < 0) {
    localError.value = 'Harga tambahan tidak boleh negatif.'
    return
  }
  if (isEdit.value) {
    localError.value = null
    emit('submit-edit', {
      defaultQtyPerItem: qty,
      extraPrice: price,
      isActive: isActive.value,
    })
    return
  }

  if (!toppingProductId.value) {
    localError.value = 'Produk topping wajib dipilih.'
    return
  }
  localError.value = null
  emit('submit-create', {
    toppingProductId: toppingProductId.value,
    defaultQtyPerItem: qty,
    extraPrice: price,
    isActive: isActive.value,
  })
}
</script>

<template>
  <BaseModal :open="open" size="xl" scrollable @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit Topping' : 'Tambah Topping' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <!-- Product -->
      <BaseFormField label="Produk Topping" field-id="topping-product" :required="!isEdit">
        <BaseSelect
          v-if="!isEdit"
          id="topping-product"
          v-model="toppingProductId"
          :options="productSelectOptions"
          placeholder="Pilih produk (bahan baku / setengah jadi)"
        />
        <p v-else class="form-readonly">{{ productLabel(toppingProductId) }}</p>
        <p v-if="!isEdit && productOptions.length === 0" class="mt-1.5 text-muted-xs">
          Semua produk bahan baku / setengah jadi aktif sudah terdaftar sebagai topping, atau belum
          ada produk yang memenuhi.
        </p>
      </BaseFormField>

      <!-- Takaran + harga -->
      <div class="field-grid">
        <BaseFormField label="Takaran / Item" field-id="topping-quantity" required>
          <div class="relative">
            <BaseInput
              id="topping-quantity"
              v-model.number="defaultQtyPerItem"
              type="number"
              min="0"
              step="any"
              class="pe-20"
            />
            <span
              class="absolute top-1/2 ltr:right-0 rtl:left-0 -translate-y-1/2 ltr:border-l rtl:border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400"
            >
              <span class="text-theme-md text-gray-500 dark:text-gray-400">
                {{ defaultUomName }}
              </span>
            </span>
          </div>
        </BaseFormField>
        <BaseFormField label="Harga Tambahan (Rp)" field-id="topping-extra-price">
          <BaseInput id="topping-extra-price" v-model.number="extraPrice" type="number" min="0" />
        </BaseFormField>
      </div>

      <!-- Status -->
      <div>
        <BaseToggle v-model="isActive" label="Aktif" />
      </div>

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="button-row pt-2">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          <template #start-icon><X class="h-4 w-4" aria-hidden="true" /></template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon><Save class="h-4 w-4" aria-hidden="true" /></template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
