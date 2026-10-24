<script setup lang="ts">
/**
 * UserList — thin controller/composition for the Users page (System
 * Administration). Full CRUD with role + outlet relations. Edit loads the user
 * detail (role + outlets) lazily to seed the form.
 */
import { computed, onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseTablePagination } from '@/components/ui'
import { Plus } from 'lucide-vue-next'
import UserTable from '@/components/system/user/UserTable.vue'
import UserFormModal from '@/components/system/user/UserFormModal.vue'
import UserDeleteModal from '@/components/system/user/UserDeleteModal.vue'
import { usePermission } from '@/composables/usePermission'
import { useUsers } from '@/composables/useUsers'
import type { User } from '@/services/user.service'

const pageTitle = 'Users'
const { can } = usePermission()
const canManage = computed<boolean>(() => can('user.manage'))

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
  roles,
  outlets,
  roleNameById,
  ensureOptions,
  fetchList,
  prevPage,
  nextPage,
  detail,
  detailLoading,
  loadDetail,
  clearDetail,
  createUser,
  updateUser,
  deleteUser,
  toMessage,
} = useUsers()

// ── Create / Edit modal ──────────────────────────────────────────────
const formOpen = ref<boolean>(false)
const formMode = ref<'create' | 'edit'>('create')
const submitting = ref<boolean>(false)
const formError = ref<string | null>(null)
const editingId = ref<string | null>(null)

async function openCreate(): Promise<void> {
  await ensureOptions()
  clearDetail()
  editingId.value = null
  formMode.value = 'create'
  formError.value = null
  formOpen.value = true
}

async function openEdit(user: User): Promise<void> {
  await ensureOptions()
  editingId.value = user.id
  formMode.value = 'edit'
  formError.value = null
  formOpen.value = true
  await loadDetail(user.id)
}

function closeForm(): void {
  formOpen.value = false
  editingId.value = null
  clearDetail()
}

async function onSubmitCreate(payload: {
  name: string
  email: string
  password: string
  phone: string
  roleId: string
  outletIds: string[]
}): Promise<void> {
  submitting.value = true
  formError.value = null
  try {
    await createUser({
      name: payload.name,
      email: payload.email,
      password: payload.password,
      phone: payload.phone || undefined,
      roleId: payload.roleId,
      outletIds: payload.outletIds,
    })
    closeForm()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

async function onSubmitEdit(payload: {
  name: string
  phone: string
  roleId: string
  isActive: boolean
  outletIds: string[]
}): Promise<void> {
  if (!editingId.value) {
    return
  }
  submitting.value = true
  formError.value = null
  try {
    await updateUser(editingId.value, {
      name: payload.name,
      phone: payload.phone || undefined,
      roleId: payload.roleId,
      isActive: payload.isActive,
      outletIds: payload.outletIds,
    })
    closeForm()
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    submitting.value = false
  }
}

// ── Delete modal ─────────────────────────────────────────────────────
const deleteOpen = ref<boolean>(false)
const deleteTarget = ref<User | null>(null)
const deleting = ref<boolean>(false)
const deleteError = ref<string | null>(null)

function openDelete(user: User): void {
  deleteTarget.value = user
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
    await deleteUser(deleteTarget.value.id)
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
  void ensureOptions()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Users" desc="Kelola pengguna, role, dan akses outlet perusahaan Anda.">
      <div class="toolbar-row">
        <div class="relative w-full sm:max-w-xs">
          <BaseInput id="user-search" v-model="search" placeholder="Cari user (nama / email)..." />
        </div>
        <BaseButton v-if="canManage" size="sm" variant="primary" @click="openCreate">
          <template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
          Tambah User
        </BaseButton>
      </div>

      <UserTable
        :items="items"
        :loading="loading"
        :error-message="errorMessage"
        :can-manage="canManage"
        :role-name-by-id="roleNameById"
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

    <UserFormModal
      :open="formOpen"
      :mode="formMode"
      :detail="detail"
      :detail-loading="detailLoading"
      :roles="roles"
      :outlets="outlets"
      :submitting="submitting"
      :error-message="formError"
      @close="closeForm"
      @submit-create="onSubmitCreate"
      @submit-edit="onSubmitEdit"
    />

    <UserDeleteModal
      :open="deleteOpen"
      :user="deleteTarget"
      :deleting="deleting"
      :error-message="deleteError"
      @close="deleteOpen = false"
      @confirm="onConfirmDelete"
    />
  </AdminLayout>
</template>
