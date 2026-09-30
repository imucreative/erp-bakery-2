<script setup lang="ts">
/**
 * RoleList — Roles page (System Administration). Dynamic Role Management
 * (ADR 49): list + view permissions + create/edit/delete with a colored
 * permission picker. Mutations are gated by `role.manage`; OWNER cannot be
 * deleted (button hidden) and its `role.manage` stays locked in the picker.
 */
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Button from '@/components/ui/Button.vue'
import RoleTable from '@/components/system/role/RoleTable.vue'
import RoleDetailModal from '@/components/system/role/RoleDetailModal.vue'
import RoleFormModal from '@/components/system/role/RoleFormModal.vue'
import RoleDeleteModal from '@/components/system/role/RoleDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/services/role.service'

const pageTitle = 'Roles'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('role.manage'))

const {
  filtered,
  loading,
  errorMessage,
  search,
  fetchList,
  detail,
  detailLoading,
  detailError,
  loadDetail,
  clearDetail,
  createRole,
  updateRole,
  deleteRole,
  toMessage,
} = useRoles()

// ── Detail (view permissions) modal ──────────────────────────────────
const detailOpen = ref<boolean>(false)
const selected = ref<Role | null>(null)

async function onView(role: Role): Promise<void> {
  selected.value = role
  detailOpen.value = true
  await loadDetail(role.id)
}

function onCloseDetail(): void {
  detailOpen.value = false
  selected.value = null
  clearDetail()
}

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Role | null>(null)
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  editing.value = null
  formError.value = null
  clearDetail()
  formOpen.value = true
}

async function openEdit(role: Role): Promise<void> {
  formMode.value = 'edit'
  editing.value = role
  formError.value = null
  formOpen.value = true
  await loadDetail(role.id)
}

function closeForm(): void {
  formOpen.value = false
  editing.value = null
  clearDetail()
}

async function onSubmitForm(payload: {
  code: string
  name: string
  description: string
  permissions: string[]
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    if (formMode.value === 'edit' && editing.value) {
      // EDIT: code is immutable — never sent. Permissions are full-replaced.
      await updateRole(editing.value.id, {
        name: payload.name,
        description: payload.description || undefined,
        permissions: payload.permissions,
      })
    } else {
      // CREATE: send code + name + optional description + permission set.
      await createRole({
        code: payload.code,
        name: payload.name,
        description: payload.description || undefined,
        permissions: payload.permissions,
      })
    }
    closeForm()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<Role | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(role: Role): void {
  deleteTarget.value = role
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
    await deleteRole(deleteTarget.value.id)
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
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Roles" desc="Kelola role beserta permission-nya.">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari role..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah Role
        </Button>
      </div>

      <RoleTable
        :items="filtered"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        @view="onView"
        @edit="openEdit"
        @delete="openDelete"
      />
    </ComponentCard>

    <RoleDetailModal
      :open="detailOpen"
      :fallback="selected"
      :detail="detail"
      :loading="detailLoading"
      :error-message="detailError"
      @close="onCloseDetail"
    />

    <RoleFormModal
      :open="formOpen"
      :mode="formMode"
      :role="editing"
      :detail="detail"
      :detail-loading="detailLoading"
      :submitting="submitting"
      :error-message="formError"
      @close="closeForm"
      @submit="onSubmitForm"
    />

    <RoleDeleteModal
      :open="deleteOpen"
      :role="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
