<script setup lang="ts">
/**
 * OutletList — thin controller/composition for the Outlets page.
 * List state + CRUD live in `useOutlets`; table and modals are separate
 * components. This view wires them and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseTablePagination } from '@/components/ui'
import OutletTable from '@/components/masterdata/outlet/OutletTable.vue'
import OutletFormModal from '@/components/masterdata/outlet/OutletFormModal.vue'
import OutletDeleteModal from '@/components/masterdata/outlet/OutletDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useOutlets } from '@/composables/useOutlets'
import type { Outlet } from '@/services/outlet.service'

const pageTitle = 'Outlets'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('outlet.manage'))

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
  createOutlet,
  updateOutlet,
  deleteOutlet,
  toMessage,
} = useOutlets()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Outlet | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(outlet: Outlet): void {
  formMode.value = 'edit'
  editing.value = outlet
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: {
  code?: string
  name: string
  address: string
  phone: string
  isActive: boolean
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateOutlet(editing.value.id, {
        name: payload.name,
        address: payload.address || undefined,
        phone: payload.phone || undefined,
        isActive: payload.isActive,
      })
    } else {
      await createOutlet({
        code: payload.code || undefined,
        name: payload.name,
        address: payload.address || undefined,
        phone: payload.phone || undefined,
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
const deleteTarget = ref<Outlet | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(outlet: Outlet): void {
  deleteTarget.value = outlet
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
    await deleteOutlet(deleteTarget.value.id)
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

    <ComponentCard title="Outlets" desc="Kelola data outlet untuk perusahaan Anda.">
      <!-- Toolbar -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="outlet-search" v-model="search" placeholder="Cari outlet..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah Outlet
        </BaseButton>
      </div>

      <OutletTable
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

    <OutletFormModal
      :open="formOpen"
      :mode="formMode"
      :outlet="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <OutletDeleteModal
      :open="deleteOpen"
      :outlet="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
