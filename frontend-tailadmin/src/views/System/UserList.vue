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
import Button from '@/components/ui/Button.vue'
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
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari user (nama / email)..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Button v-if="canManage" size="sm" variant="primary" :on-click="openCreate">
          + Tambah User
        </Button>
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
