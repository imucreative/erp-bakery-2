<script setup lang="ts">
/**
 * UomList — thin controller/composition for the Units of Measure page.
 * All list state + CRUD live in `useUoms`; table and modals are separate
 * components. This view only wires them together and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseTablePagination } from '@/components/ui'
import UomTable from '@/components/masterdata/uom/UomTable.vue'
import UomFormModal from '@/components/masterdata/uom/UomFormModal.vue'
import UomDeleteModal from '@/components/masterdata/uom/UomDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useUoms } from '@/composables/useUoms'
import type { Uom } from '@/services/uom.service'

const pageTitle = 'Units of Measure'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('uom.manage'))

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
  createUom,
  updateUom,
  deleteUom,
  toMessage,
} = useUoms()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Uom | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(uom: Uom): void {
  formMode.value = 'edit'
  editing.value = uom
  formError.value = null
  formOpen.value = true
}

async function onSubmitForm(payload: { name: string; isActive: boolean }): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      await updateUom(editing.value.id, payload.name, payload.isActive)
    } else {
      await createUom(payload.name)
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
const deleteTarget = ref<Uom | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(uom: Uom): void {
  deleteTarget.value = uom
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
    await deleteUom(deleteTarget.value.id)
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

    <ComponentCard title="Units of Measure" desc="Kelola satuan ukur untuk perusahaan Anda.">
      <!-- Toolbar -->
      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="uom-search" v-model="search" placeholder="Cari satuan..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon>
            <Plus class="h-4 w-4" aria-hidden="true" />
          </template>
          Tambah UOM
        </BaseButton>
      </div>

      <UomTable
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

    <UomFormModal
      :open="formOpen"
      :mode="formMode"
      :uom="editing"
      :submitting="submitting"
      :error-message="formError"
      @close="formOpen = false"
      @submit="onSubmitForm"
    />

    <UomDeleteModal
      :open="deleteOpen"
      :uom="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
