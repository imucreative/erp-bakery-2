<script setup lang="ts">
/**
 * ToppingFormModal — create/edit modal for a GLOBAL topping.
 *
 * CREATE: pilih produk topping (RAW_MATERIAL / SEMI_FINISHED, hanya yang belum
 *   jadi topping) + takaran per item (defaultQtyPerItem > 0) + harga tambahan
 *   (extraPrice >= 0) + urutan (sortOrder) + toggle aktif.
 * EDIT: produk topping read-only (tidak diubah backend); editable: takaran,
 *   harga tambahan, urutan, dan status aktif.
 *
 * Self-contained form state; emits `submit-create` / `submit-edit` with the
 * payload and lets the parent run the mutation (controls `submitting` +
 * `errorMessage`). Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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
  sortOrder: number
  isActive: boolean
}
interface EditPayload {
  defaultQtyPerItem: number
  extraPrice: number
  sortOrder: number
  isActive: boolean
}

const isEdit = computed<boolean>(() => props.mode === 'edit')

const toppingProductId = ref<string>('')
const defaultQtyPerItem = ref<number>(1)
const extraPrice = ref<number>(0)
const sortOrder = ref<number>(0)
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.topping] as const,
  ([open]) => {
    if (open) {
      const t = props.topping
      toppingProductId.value = t?.toppingProductId ?? ''
      defaultQtyPerItem.value = t?.defaultQtyPerItem ?? 1
      extraPrice.value = t?.extraPrice ?? 0
      sortOrder.value = t?.sortOrder ?? 0
      isActive.value = t?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const readonlyClass =
  'rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-300'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

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
  const order = Math.trunc(Number(sortOrder.value) || 0)

  if (isEdit.value) {
    localError.value = null
    emit('submit-edit', {
      defaultQtyPerItem: qty,
      extraPrice: price,
      sortOrder: order,
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
    sortOrder: order,
    isActive: isActive.value,
  })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <!-- Transparent backdrop -->
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <!-- Panel -->
    <div
      class="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ isEdit ? 'Edit Topping' : 'Tambah Topping' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <!-- Product -->
        <div>
          <label :class="labelClass">
            Produk Topping<span v-if="!isEdit" class="text-error-500">*</span>
          </label>
          <div v-if="!isEdit" class="relative">
            <select v-model="toppingProductId" :class="[inputClass, 'appearance-none pe-10']">
              <option value="" disabled>Pilih produk (bahan baku / setengah jadi)</option>
              <option v-for="p in productOptions" :key="p.id" :value="p.id">
                {{ p.name }} ({{ p.sku }})
              </option>
            </select>
            <ChevronDownIcon
              class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
          <p v-else :class="readonlyClass">{{ productLabel(toppingProductId) }}</p>
          <p
            v-if="!isEdit && productOptions.length === 0"
            class="mt-1.5 text-theme-xs text-gray-400 dark:text-gray-500"
          >
            Semua produk bahan baku / setengah jadi aktif sudah terdaftar sebagai topping,
            atau belum ada produk yang memenuhi.
          </p>
        </div>

        <!-- Takaran + harga -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Takaran / Item<span class="text-error-500">*</span></label>
            <input
              v-model.number="defaultQtyPerItem"
              type="number"
              min="0"
              step="any"
              :class="inputClass"
            />
          </div>
          <div>
            <label :class="labelClass">Harga Tambahan (Rp)</label>
            <input v-model.number="extraPrice" type="number" min="0" :class="inputClass" />
          </div>
        </div>

        <!-- Urutan + aktif -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Urutan</label>
            <input v-model.number="sortOrder" type="number" min="0" :class="inputClass" />
          </div>
          <div class="flex items-end">
            <ToggleSwitch v-model="isActive" label="Aktif" />
          </div>
        </div>

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
