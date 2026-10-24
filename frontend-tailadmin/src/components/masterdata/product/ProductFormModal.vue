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
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseToggle,
} from '@/components/ui'
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

const groupOptions = computed(() =>
  props.groups.map((group) => ({ label: group.name, value: group.id })),
)
const categorySelectOptions = computed(() =>
  categoryOptions.value.map((category) => ({ label: category.name, value: category.id })),
)
const uomOptions = computed(() => props.uoms.map((uom) => ({ label: uom.name, value: uom.id })))
const supplierOptions = computed(() =>
  props.suppliers.map((supplier) => ({ label: supplier.name, value: supplier.id })),
)
const productTypeOptions = PRODUCT_TYPES.map((type) => ({
  label: PRODUCT_TYPE_LABELS[type],
  value: type,
}))

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
  <BaseModal :open="open" size="2xl" scrollable @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ isEdit ? 'Edit Produk' : 'Tambah Produk' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <div class="field-grid">
        <!-- SKU -->
        <BaseFormField label="SKU" field-id="product-sku" required>
          <BaseInput v-if="!isEdit" id="product-sku" v-model="sku" placeholder="SKU-ROTI-001" />
          <p v-else class="form-readonly">{{ sku }}</p>
        </BaseFormField>
        <!-- Barcode -->
        <BaseFormField label="Barcode" field-id="product-barcode">
          <BaseInput id="product-barcode" v-model="barcode" placeholder="8991234567890" />
        </BaseFormField>
      </div>

      <!-- Name -->
      <BaseFormField label="Nama" field-id="product-name" required>
        <BaseInput id="product-name" v-model="name" placeholder="Roti Tawar Gandum" />
      </BaseFormField>

      <!-- Relations -->
      <div class="field-grid">
        <BaseFormField label="Grup Produk" field-id="product-group" required>
          <BaseSelect
            v-if="!isEdit"
            id="product-group"
            v-model="productGroupId"
            :options="groupOptions"
            placeholder="Pilih grup"
          />
          <p v-else class="text-sm text-gray-600 dark:text-gray-300">
            {{ relationName(groups, productGroupId) }}
          </p>
        </BaseFormField>
        <BaseFormField label="Kategori" field-id="product-category" required>
          <BaseSelect
            v-if="!isEdit"
            id="product-category"
            v-model="categoryId"
            :options="categorySelectOptions"
            :disabled="!productGroupId"
            :placeholder="productGroupId ? 'Pilih kategori' : 'Pilih grup dulu'"
          />
          <p v-else class="text-sm text-gray-600 dark:text-gray-300">
            {{ relationName(categories, categoryId) }}
          </p>
        </BaseFormField>
        <BaseFormField label="UOM" field-id="product-uom" required>
          <BaseSelect
            v-if="!isEdit"
            id="product-uom"
            v-model="uomId"
            :options="uomOptions"
            placeholder="Pilih UOM"
          />
          <p v-else class="text-sm text-gray-600 dark:text-gray-300">
            {{ relationName(uoms, uomId) }}
          </p>
        </BaseFormField>
        <BaseFormField label="Supplier" field-id="product-supplier" required>
          <BaseSelect
            v-if="!isEdit"
            id="product-supplier"
            v-model="supplierId"
            :options="supplierOptions"
            placeholder="Pilih supplier"
          />
          <p v-else class="text-sm text-gray-600 dark:text-gray-300">
            {{ relationName(suppliers, supplierId) }}
          </p>
        </BaseFormField>
      </div>

      <!-- Type + prices -->
      <div class="field-grid">
        <BaseFormField label="Tipe Produk" field-id="product-type">
          <BaseSelect id="product-type" v-model="productType" :options="productTypeOptions" />
        </BaseFormField>
        <BaseFormField label="Stok Minimum" field-id="product-minimum-stock">
          <BaseInput
            id="product-minimum-stock"
            v-model.number="minimumStock"
            type="number"
            min="0"
          />
        </BaseFormField>
        <BaseFormField label="Harga Beli" field-id="product-purchase-price">
          <BaseInput
            id="product-purchase-price"
            v-model.number="purchasePrice"
            type="number"
            min="0"
          />
        </BaseFormField>
        <BaseFormField label="Harga Jual" field-id="product-selling-price">
          <BaseInput
            id="product-selling-price"
            v-model.number="sellingPrice"
            type="number"
            min="0"
          />
        </BaseFormField>
        <BaseFormField label="Masa Simpan (hari)" field-id="product-shelf-life">
          <BaseInput id="product-shelf-life" v-model.number="shelfLifeDays" type="number" min="0" />
        </BaseFormField>
        <div class="flex flex-wrap items-end gap-6">
          <BaseToggle v-model="isBatchTracked" label="Lacak batch" />
          <BaseToggle v-model="hasToppings" label="Punya Topping" />
          <BaseToggle v-if="isEdit" v-model="isActive" label="Aktif" />
        </div>
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
