<script setup lang="ts">
/**
 * ProductList — thin controller/composition for the Products page (the
 * multi-relation master). List state + CRUD + relation options live in
 * `useProducts`; table and modals are separate components.
 */
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import ProductTable from '@/components/masterdata/product/ProductTable.vue'
import ProductFormModal from '@/components/masterdata/product/ProductFormModal.vue'
import ProductDeleteModal from '@/components/masterdata/product/ProductDeleteModal.vue'
import ProductUomConversionModal from '@/components/masterdata/product/ProductUomConversionModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useProducts } from '@/composables/useProducts'
import type {
  Product,
  CreateProductPayload,
  UpdateProductPayload,
} from '@/services/product.service'

const pageTitle = 'Products'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('product.manage'))

const {
  items,
  meta,
  loading,
  errorMessage,
  search,
  page,
  totalPages,
  canPrev,
  canNext,
  groups,
  categories,
  uoms,
  suppliers,
  uomNameById,
  ensureOptions,
  fetchList,
  prevPage,
  nextPage,
  createProduct,
  updateProduct,
  deleteProduct,
  toMessage,
} = useProducts()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Product | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

async function openCreate(): Promise<void> {
  await ensureOptions()
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

async function openEdit(product: Product): Promise<void> {
  await ensureOptions()
  formMode.value = 'edit'
  editing.value = product
  formError.value = null
  formOpen.value = true
}

async function onSubmitCreate(payload: {
  sku: string
  barcode: string
  name: string
  productGroupId: string
  categoryId: string
  uomId: string
  supplierId: string
  productType: CreateProductPayload['productType']
  purchasePrice: number
  sellingPrice: number
  minimumStock: number
  shelfLifeDays: number
  isBatchTracked: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    await createProduct({
      sku: payload.sku,
      barcode: payload.barcode || undefined,
      name: payload.name,
      productGroupId: payload.productGroupId,
      categoryId: payload.categoryId,
      uomId: payload.uomId,
      supplierId: payload.supplierId,
      productType: payload.productType,
      purchasePrice: payload.purchasePrice,
      sellingPrice: payload.sellingPrice,
      minimumStock: payload.minimumStock,
      shelfLifeDays: payload.shelfLifeDays,
      isBatchTracked: payload.isBatchTracked,
    })
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

async function onSubmitEdit(payload: {
  name: string
  barcode: string
  productType: UpdateProductPayload['productType']
  purchasePrice: number
  sellingPrice: number
  minimumStock: number
  shelfLifeDays: number
  isBatchTracked: boolean
  isActive: boolean
}): Promise<void> {
  if (!editing.value) {
    return
  }
  submitting.value = true
  formError.value = null
  try {
    await updateProduct(editing.value.id, {
      name: payload.name,
      barcode: payload.barcode || undefined,
      productType: payload.productType,
      purchasePrice: payload.purchasePrice,
      sellingPrice: payload.sellingPrice,
      minimumStock: payload.minimumStock,
      shelfLifeDays: payload.shelfLifeDays,
      isBatchTracked: payload.isBatchTracked,
      isActive: payload.isActive,
    })
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<Product | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(product: Product): void {
  deleteTarget.value = product
  deleteError.value = null
  deleteOpen.value = true
}

async function onConfirmDelete(): Promise<void> {
  if (!deleteTarget.value) {
    return
  }
  deleting.value = true
  deleteError.value = null
  try {
    await deleteProduct(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

// ── UOM conversion modal ─────────────────────────────────────────────
const conversionOpen = ref<boolean>(false)
const conversionTarget = ref<Product | null>(null)

async function openConversions(product: Product): Promise<void> {
  await ensureOptions()
  conversionTarget.value = product
  conversionOpen.value = true
}

onMounted(() => {
  void fetchList()
  void ensureOptions()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Products" desc="Kelola produk (dengan grup, kategori, UOM, dan supplier).">
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari produk (nama / SKU / barcode)..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah Produk
        </Button>
      </div>

      <ProductTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        :uom-name-by-id="uomNameById"
        @edit="openEdit"
        @delete="openDelete"
        @conversions="openConversions"
      />

      <!-- Pagination -->
      <div
        v-if="!loading && !errorMessage && items.length > 0"
        class="flex flex-col items-center justify-between gap-3 pt-2 sm:flex-row"
      >
        <span class="text-theme-sm text-gray-500 dark:text-gray-400">
          Menampilkan {{ items.length }} dari {{ meta.total }} data
        </span>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="outline" :disabled="!canPrev" :on-click="prevPage">
            Sebelumnya
          </Button>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <Button size="sm" variant="outline" :disabled="!canNext" :on-click="nextPage">
            Berikutnya
          </Button>
        </div>
      </div>
    </ComponentCard>

    <ProductFormModal
      :open="formOpen"
      :mode="formMode"
      :product="editing"
      :groups="groups"
      :categories="categories"
      :uoms="uoms"
      :suppliers="suppliers"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit-create="onSubmitCreate"
      @submit-edit="onSubmitEdit"
    />

    <ProductDeleteModal
      :open="deleteOpen"
      :product="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />

    <ProductUomConversionModal
      :open="conversionOpen"
      :product="conversionTarget"
      :uoms="uoms"
      :uom-name-by-id="uomNameById"
      :can-manage="canManage"
      @close="conversionOpen = false"
    />
  </AdminLayout>
</template>
