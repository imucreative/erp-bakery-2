<script setup lang="ts">
/**
 * CategoryList — thin controller/composition for the Categories page.
 * List state + CRUD + product-group options live in `useCategories`; table and
 * modals are separate components. Categories belong to a product group (the
 * first relation-backed master module).
 */
import { computed, onMounted, ref } from 'vue'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput } from '@/components/ui'
import CategoryTable from '@/components/masterdata/category/CategoryTable.vue'
import CategoryFormModal from '@/components/masterdata/category/CategoryFormModal.vue'
import CategoryDeleteModal from '@/components/masterdata/category/CategoryDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useCategories } from '@/composables/useCategories'
import type { Category } from '@/services/category.service'

const pageTitle = 'Categories'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('category.manage'))

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
  groupNameById,
  ensureGroups,
  fetchList,
  prevPage,
  nextPage,
  createCategory,
  updateCategory,
  deleteCategory,
  toMessage,
} = useCategories()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Category | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

async function openCreate(): Promise<void> {
  await ensureGroups()
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

async function openEdit(category: Category): Promise<void> {
  await ensureGroups()
  formMode.value = 'edit'
  editing.value = category
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  productGroupId: string
  name: string
  description: string
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateCategory(editing.value.id, {
        name: payload.name,
        description: payload.description || undefined,
        isActive: payload.isActive,
      })
    } else {
      await createCategory({
        productGroupId: payload.productGroupId,
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
const deleteTarget = ref<Category | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(category: Category): void {
  deleteTarget.value = category
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
    await deleteCategory(deleteTarget.value.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void fetchList()
  // Load group options up front so the table's group column resolves names.
  void ensureGroups()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard
      title="Categories"
      desc="Kelola kategori produk (dikelompokkan per grup produk)."
    >
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="category-search" v-model="search" placeholder="Cari kategori..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          + Tambah Kategori
        </BaseButton>
      </div>

      <CategoryTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        :group-name-by-id="groupNameById"
        @edit="openEdit"
        @delete="openDelete"
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
          <BaseButton size="sm" variant="outline" :disabled="!canPrev" @click="prevPage">
            <template #start-icon>
              <ChevronLeft class="h-4 w-4" aria-hidden="true" />
            </template>
            Sebelumnya
          </BaseButton>
          <span class="text-theme-sm text-gray-600 dark:text-gray-300">
            {{ page }} / {{ totalPages }}
          </span>
          <BaseButton size="sm" variant="outline" :disabled="!canNext" @click="nextPage">
            <template #end-icon>
              <ChevronRight class="h-4 w-4" aria-hidden="true" />
            </template>
            Berikutnya
          </BaseButton>
        </div>
      </div>
    </ComponentCard>

    <CategoryFormModal
      :open="formOpen"
      :mode="formMode"
      :category="editing"
      :groups="groups"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <CategoryDeleteModal
      :open="deleteOpen"
      :category="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
