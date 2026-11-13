<script setup lang="ts">
/**
 * ProductTypeList — master-data page for the product-type catalog.
 * List state + CRUD live in `useProductTypes`; table/form/delete modal are
 * presentational. Code is immutable after create; deletion is blocked by the
 * backend while products still reference the type (use Edit → nonaktifkan).
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput } from '@/components/ui'
import ProductTypeTable from '@/components/masterdata/product-type/ProductTypeTable.vue'
import ProductTypeFormModal from '@/components/masterdata/product-type/ProductTypeFormModal.vue'
import ProductTypeDeleteModal from '@/components/masterdata/product-type/ProductTypeDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useProductTypes } from '@/composables/useProductTypes'
import type { ProductTypeOption } from '@/services/product-type.service'

const pageTitle = 'Product Types'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('product.manage'))

const {
  filteredItems,
  loading,
  errorMessage,
  search,
  fetchList,
  createProductType,
  updateProductType,
  deleteProductType,
  toMessage,
} = useProductTypes()

interface FormPayload {
  code?: string
  name: string
  description: string
  isActive: boolean
}

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<ProductTypeOption | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(productType: ProductTypeOption): void {
  formMode.value = 'edit'
  editing.value = productType
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: FormPayload): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateProductType(editing.value.code, {
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
      })
    } else {
      await createProductType({
        code: payload.code ?? '',
        name: payload.name,
        description: payload.description,
        isActive: payload.isActive,
      })
    }
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<ProductTypeOption | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(productType: ProductTypeOption): void {
  deleteTarget.value = productType
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
    await deleteProductType(deleteTarget.value.code)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

void fetchList()
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Product Types"
      desc="Kelola tipe produk yang dipakai di master produk. Kode tidak dapat diubah setelah dibuat."
    >
      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput
            id="product-type-search"
            v-model="search"
            placeholder="Cari kode atau nama tipe..."
          />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Tipe Produk
        </BaseButton>
      </div>

      <ProductTypeTable
        :items="filteredItems"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />
    </ComponentCard>

    <ProductTypeFormModal
      :open="formOpen"
      :mode="formMode"
      :product-type="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <ProductTypeDeleteModal
      :open="deleteOpen"
      :product-type="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
