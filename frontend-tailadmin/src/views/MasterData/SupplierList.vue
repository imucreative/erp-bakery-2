<script setup lang="ts">
/**
 * SupplierList — thin controller/composition for the Suppliers page.
 * List state + CRUD live in `useSuppliers`; table and modals are separate
 * components. This view wires them and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseTablePagination } from '@/components/ui'
import SupplierTable from '@/components/masterdata/supplier/SupplierTable.vue'
import SupplierFormModal from '@/components/masterdata/supplier/SupplierFormModal.vue'
import SupplierDeleteModal from '@/components/masterdata/supplier/SupplierDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useSuppliers } from '@/composables/useSuppliers'
import type { Supplier } from '@/services/supplier.service'

const pageTitle = 'Suppliers'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('supplier.manage'))

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
  createSupplier,
  updateSupplier,
  deleteSupplier,
  toMessage,
} = useSuppliers()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Supplier | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(supplier: Supplier): void {
  formMode.value = 'edit'
  editing.value = supplier
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  name: string
  address: string
  phone: string
  picName: string
  isActive: boolean
  defaultPaymentTermId: string | null
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      // EDIT: send the selected id, or null to clear the payment term.
      await updateSupplier(editing.value.id, {
        name: payload.name,
        address: payload.address || undefined,
        phone: payload.phone || undefined,
        picName: payload.picName || undefined,
        isActive: payload.isActive,
        defaultPaymentTermId: payload.defaultPaymentTermId,
      })
    } else {
      // CREATE: include the id only when chosen; omit when blank.
      await createSupplier({
        name: payload.name,
        address: payload.address || undefined,
        phone: payload.phone || undefined,
        picName: payload.picName || undefined,
        defaultPaymentTermId: payload.defaultPaymentTermId ?? undefined,
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
const deleteTarget = ref<Supplier | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(supplier: Supplier): void {
  deleteTarget.value = supplier
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
    await deleteSupplier(deleteTarget.value.id)
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

    <ComponentCard title="Suppliers" desc="Kelola data supplier untuk perusahaan Anda.">
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="supplier-search" v-model="search" placeholder="Cari supplier..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Supplier
        </BaseButton>
      </div>

      <SupplierTable
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

    <SupplierFormModal
      :open="formOpen"
      :mode="formMode"
      :supplier="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <SupplierDeleteModal
      :open="deleteOpen"
      :supplier="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
