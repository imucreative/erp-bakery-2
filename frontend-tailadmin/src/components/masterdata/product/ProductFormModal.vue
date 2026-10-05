<script setup lang="ts">
/**
 * ProductFormModal — create/edit modal for a product (the multi-relation form).
 *
 * CREATE: sku + name + cascading group→category + uom + supplier + type + prices.
 *   Selecting a group filters the category dropdown; changing group resets the
 *   category. All relations are required.
 * EDIT: sku + relations (group/category/uom/supplier) are read-only (backend PUT
 *   does not change them); editable: name, barcode, type, prices, stock, flags,
 *   active toggle.
 *
 * Transparent backdrop per UI standard.
 */
import { computed, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductType,
} from '@/services/product.service'
import type { ProductGroup } from '@/services/product-group.service'
import type { Category } from '@/services/category.service'
import type { Uom } from '@/services/uom.service'
import type { Supplier } from '@/services/supplier.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    product?: Product | null
    groups: ProductGroup[]
    categories: Category[]
    uoms: Uom[]
    suppliers: Supplier[]
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { product: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'submit-create', payload: CreatePayload): void
  (event: 'submit-edit', payload: EditPayload): void
}>()

interface CreatePayload {
  sku: string
  barcode: string
  name: string
  productGroupId: string
  categoryId: string
  uomId: string
  supplierId: string
  productType: ProductType
  purchasePrice: number
  sellingPrice: number
  minimumStock: number
  shelfLifeDays: number
  isBatchTracked: boolean
  hasToppings: boolean
}
interface EditPayload {
  name: string
  barcode: string
  productType: ProductType
  purchasePrice: number
  sellingPrice: number
  minimumStock: number
  shelfLifeDays: number
  isBatchTracked: boolean
  hasToppings: boolean
  isActive: boolean
}

const isEdit = computed<boolean>(() => props.mode === 'edit')

const sku = ref<string>('')
const barcode = ref<string>('')
const name = ref<string>('')
const productGroupId = ref<string>('')
const categoryId = ref<string>('')
const uomId = ref<string>('')
const supplierId = ref<string>('')
const productType = ref<ProductType>('FINISHED_GOODS')
const purchasePrice = ref<number>(0)
const sellingPrice = ref<number>(0)
const minimumStock = ref<number>(0)
const shelfLifeDays = ref<number>(0)
const isBatchTracked = ref<boolean>(true)
const hasToppings = ref<boolean>(false)
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

// Categories filtered by the chosen group (cascading dropdown, create mode).
const categoryOptions = computed<Category[]>(() =>
  productGroupId.value
    ? props.categories.filter((c) => c.productGroupId === productGroupId.value)
    : [],
)

// Reset category when the group changes (create mode) to avoid a mismatched pair.
watch(productGroupId, (next, prev) => {
  if (!isEdit.value && next !== prev) {
    categoryId.value = ''
  }
})

const relationName = (rows: Array<{ id: string; name: string }>, id: string): string =>
  rows.find((r) => r.id === id)?.name ?? id

watch(
  () => [props.open, props.product] as const,
  ([open]) => {
    if (open) {
      const p = props.product
      sku.value = p?.sku ?? ''
      barcode.value = p?.barcode ?? ''
      name.value = p?.name ?? ''
      productGroupId.value = p?.productGroupId ?? ''
      categoryId.value = p?.categoryId ?? ''
      uomId.value = p?.uomId ?? ''
      supplierId.value = p?.supplierId ?? ''
      productType.value = p?.productType ?? 'FINISHED_GOODS'
      purchasePrice.value = p?.purchasePrice ?? 0
      sellingPrice.value = p?.sellingPrice ?? 0
      minimumStock.value = p?.minimumStock ?? 0
      shelfLifeDays.value = p?.shelfLifeDays ?? 0
      isBatchTracked.value = p?.isBatchTracked ?? true
      hasToppings.value = p?.hasToppings ?? false
      isActive.value = p?.isActive ?? true
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

function onSubmit(): void {
  if (isEdit.value) {
    if (name.value.trim().length === 0) {
      localError.value = 'Nama wajib diisi.'
      return
    }
    localError.value = null
    emit('submit-edit', {
      name: name.value.trim(),
      barcode: barcode.value.trim(),
      productType: productType.value,
      purchasePrice: Number(purchasePrice.value) || 0,
      sellingPrice: Number(sellingPrice.value) || 0,
      minimumStock: Number(minimumStock.value) || 0,
      shelfLifeDays: Number(shelfLifeDays.value) || 0,
      isBatchTracked: isBatchTracked.value,
      hasToppings: hasToppings.value,
      isActive: isActive.value,
    })
    return
  }

  // create validation
  if (sku.value.trim().length === 0) {
    localError.value = 'SKU wajib diisi.'
    return
  }
  if (name.value.trim().length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  if (!productGroupId.value || !categoryId.value || !uomId.value || !supplierId.value) {
    localError.value = 'Grup, kategori, UOM, dan supplier wajib dipilih.'
    return
  }
  localError.value = null
  emit('submit-create', {
    sku: sku.value.trim(),
    barcode: barcode.value.trim(),
    name: name.value.trim(),
    productGroupId: productGroupId.value,
    categoryId: categoryId.value,
    uomId: uomId.value,
    supplierId: supplierId.value,
    productType: productType.value,
    purchasePrice: Number(purchasePrice.value) || 0,
    sellingPrice: Number(sellingPrice.value) || 0,
    minimumStock: Number(minimumStock.value) || 0,
    shelfLifeDays: Number(shelfLifeDays.value) || 0,
    isBatchTracked: isBatchTracked.value,
    hasToppings: hasToppings.value,
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
      class="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ isEdit ? 'Edit Produk' : 'Tambah Produk' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <!-- SKU -->
          <div>
            <label :class="labelClass">SKU<span v-if="!isEdit" class="text-error-500">*</span></label>
            <input v-if="!isEdit" v-model="sku" type="text" placeholder="SKU-ROTI-001" :class="inputClass" />
            <p v-else :class="readonlyClass">{{ sku }}</p>
          </div>
          <!-- Barcode -->
          <div>
            <label :class="labelClass">Barcode</label>
            <input v-model="barcode" type="text" placeholder="8991234567890" :class="inputClass" />
          </div>
        </div>

        <!-- Name -->
        <div>
          <label :class="labelClass">Nama<span class="text-error-500">*</span></label>
          <input v-model="name" type="text" placeholder="Roti Tawar Gandum" :class="inputClass" />
        </div>

        <!-- Relations -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Grup Produk<span v-if="!isEdit" class="text-error-500">*</span></label>
            <div v-if="!isEdit" class="relative">
              <select v-model="productGroupId" :class="[inputClass, 'appearance-none pe-10']">
                <option value="" disabled>Pilih grup</option>
                <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
            <p v-else :class="readonlyClass">{{ relationName(groups, productGroupId) }}</p>
          </div>
          <div>
            <label :class="labelClass">Kategori<span v-if="!isEdit" class="text-error-500">*</span></label>
            <div v-if="!isEdit" class="relative">
              <select
                v-model="categoryId"
                :disabled="!productGroupId"
                :class="[inputClass, 'appearance-none pe-10', !productGroupId ? 'cursor-not-allowed opacity-60' : '']"
              >
                <option value="" disabled>{{ productGroupId ? 'Pilih kategori' : 'Pilih grup dulu' }}</option>
                <option v-for="c in categoryOptions" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
            <p v-else :class="readonlyClass">{{ relationName(categories, categoryId) }}</p>
          </div>
          <div>
            <label :class="labelClass">UOM<span v-if="!isEdit" class="text-error-500">*</span></label>
            <div v-if="!isEdit" class="relative">
              <select v-model="uomId" :class="[inputClass, 'appearance-none pe-10']">
                <option value="" disabled>Pilih UOM</option>
                <option v-for="u in uoms" :key="u.id" :value="u.id">{{ u.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
            <p v-else :class="readonlyClass">{{ relationName(uoms, uomId) }}</p>
          </div>
          <div>
            <label :class="labelClass">Supplier<span v-if="!isEdit" class="text-error-500">*</span></label>
            <div v-if="!isEdit" class="relative">
              <select v-model="supplierId" :class="[inputClass, 'appearance-none pe-10']">
                <option value="" disabled>Pilih supplier</option>
                <option v-for="s in suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
            <p v-else :class="readonlyClass">{{ relationName(suppliers, supplierId) }}</p>
          </div>
        </div>

        <!-- Type + prices -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Tipe Produk</label>
            <div class="relative">
              <select v-model="productType" :class="[inputClass, 'appearance-none pe-10']">
                <option v-for="t in PRODUCT_TYPES" :key="t" :value="t">{{ PRODUCT_TYPE_LABELS[t] }}</option>
              </select>
              <ChevronDownIcon
                class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label :class="labelClass">Stok Minimum</label>
            <input v-model.number="minimumStock" type="number" min="0" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">Harga Beli</label>
            <input v-model.number="purchasePrice" type="number" min="0" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">Harga Jual</label>
            <input v-model.number="sellingPrice" type="number" min="0" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">Masa Simpan (hari)</label>
            <input v-model.number="shelfLifeDays" type="number" min="0" :class="inputClass" />
          </div>
          <div class="flex flex-wrap items-end gap-6">
            <ToggleSwitch v-model="isBatchTracked" label="Lacak batch" />
            <ToggleSwitch v-model="hasToppings" label="Punya Topping" />
            <ToggleSwitch v-if="isEdit" v-model="isActive" label="Aktif" />
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
