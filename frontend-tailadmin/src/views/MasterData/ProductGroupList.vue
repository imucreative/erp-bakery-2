<script setup lang="ts">
/**
 * ProductGroupList — thin controller/composition for the Product Groups page.
 * List state + CRUD live in `useProductGroups`; table and modals are separate
 * components. This view wires them and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseTablePagination } from '@/components/ui'
import ProductGroupTable from '@/components/masterdata/product-group/ProductGroupTable.vue'
import ProductGroupFormModal from '@/components/masterdata/product-group/ProductGroupFormModal.vue'
import ProductGroupDeleteModal from '@/components/masterdata/product-group/ProductGroupDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useProductGroups } from '@/composables/useProductGroups'
import type { ProductGroup } from '@/services/product-group.service'

const pageTitle = 'Product Groups'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('product-group.manage'))

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
  fetchList,
  prevPage,
  nextPage,
  createGroup,
  updateGroup,
  deleteGroup,
  toMessage,
} = useProductGroups()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<ProductGroup | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(group: ProductGroup): void {
  formMode.value = 'edit'
  editing.value = group
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  name: string
  description: string
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateGroup(editing.value.id, {
        name: payload.name,
        description: payload.description || undefined,
        isActive: payload.isActive,
      })
    } else {
      await createGroup({
        name: payload.name,
        description: payload.description || undefined,
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
const deleteTarget = ref<ProductGroup | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(group: ProductGroup): void {
  deleteTarget.value = group
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
    await deleteGroup(deleteTarget.value.id)
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

    <ComponentCard title="Product Groups" desc="Kelola grup produk untuk perusahaan Anda.">
      <!-- Toolbar -->
      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="product-group-search" v-model="search" placeholder="Cari grup produk..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Grup
        </BaseButton>
      </div>

      <ProductGroupTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @edit="openEdit"
        @delete="openDelete"
      />

      <!-- Pagination -->
      <BaseTablePagination
        v-if="!loading && !errorMessage && items.length > 0"
        :current-count="items.length"
        :total-items="meta.total"
        :current-page="page"
        :total-pages="totalPages"
        :has-previous="canPrev"
        :has-next="canNext"
        @previous="prevPage"
        @next="nextPage"
      />
    </ComponentCard>

    <ProductGroupFormModal
      :open="formOpen"
      :mode="formMode"
      :group="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <ProductGroupDeleteModal
      :open="deleteOpen"
      :group="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
