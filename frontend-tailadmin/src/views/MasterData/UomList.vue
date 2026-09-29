<script setup lang="ts">
/**
 * UomList — thin controller/composition for the Units of Measure page.
 * All list state + CRUD live in `useUoms`; table and modals are separate
 * components. This view only wires them together and owns modal open/mode state.
 */
import { computed, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari satuan..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah UOM
        </Button>
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
