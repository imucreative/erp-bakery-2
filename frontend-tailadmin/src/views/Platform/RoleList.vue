<script setup lang="ts">
/**
 * Platform RoleList — role management per company for the Platform Console.
 * SUPER_ADMIN picks a company, then lists/views/creates/edits/deletes that
 * company's roles. Mutations are audited by the backend (`platform_roles`);
 * permission changes reach affected users when their access token refreshes.
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseAlert, BaseButton, BaseInput, BaseSelect } from '@/components/ui'
import { Plus } from 'lucide-vue-next'
import RoleTable from '@/components/system/role/RoleTable.vue'
import RoleDetailModal from '@/components/system/role/RoleDetailModal.vue'
import RoleFormModal from '@/components/system/role/RoleFormModal.vue'
import RoleDeleteModal from '@/components/system/role/RoleDeleteModal.vue'
import { usePlatformRoles } from '@/composables/usePlatformRoles'
import type { Role } from '@/services/role.service'

const {
  companyId,
  companyOptions,
  filtered,
  loading,
  errorMessage,
  search,
  detail,
  detailLoading,
  detailError,
  catalog,
  catalogLoading,
  catalogError,
  loadCompanies,
  selectCompany,
  loadDetail,
  clearDetail,
  fetchCatalog,
  createRole,
  updateRole,
  deleteRole,
  toMessage,
} = usePlatformRoles()

function onCompanyChange(value: string): void {
  void selectCompany(value)
}

// ── Detail (view permissions) modal ──────────────────────────────────
const detailOpen = ref(false)
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
const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const editing = ref<Role | null>(null)
const submitting = ref(false)
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
      // code is immutable — never sent; permissions are full-replaced.
      await updateRole(editing.value.id, {
        name: payload.name,
        description: payload.description || undefined,
        permissions: payload.permissions,
      })
    } else {
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
const deleteOpen = ref(false)
const deleteTarget = ref<Role | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)

function openDelete(role: Role): void {
  deleteTarget.value = role
  deleteError.value = null
  deleteOpen.value = true
}

async function onConfirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
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
  void loadCompanies()
  void fetchCatalog()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Platform Roles" />

    <div class="space-y-6">
      <ComponentCard
        title="Roles"
        desc="Kelola role per perusahaan. Halaman ini hanya untuk Super Admin."
      >
        <div class="space-y-4">
          <BaseAlert
            v-if="!companyId"
            :message="'Pilih perusahaan terlebih dahulu untuk melihat dan mengelola role.'"
            size="sm"
          />
          <BaseAlert v-if="catalogError" :message="catalogError" size="sm" />

          <div class="toolbar-row">
            <div class="stack-row">
              <div class="w-full sm:max-w-xs">
                <BaseSelect
                  id="role-company"
                  :model-value="companyId"
                  :options="companyOptions"
                  @update:model-value="onCompanyChange"
                />
              </div>
              <div class="w-full sm:max-w-xs">
                <BaseInput
                  id="role-search"
                  v-model="search"
                  placeholder="Cari role..."
                  :disabled="!companyId"
                />
              </div>
            </div>
            <BaseButton
              size="sm"
              variant="primary"
              :disabled="!companyId || catalogLoading"
              @click="openCreate"
            >
              <template #start-icon><Plus class="h-4 w-4" aria-hidden="true" /></template>
              Tambah Role
            </BaseButton>
          </div>

          <RoleTable
            :items="filtered"
            :loading="loading"
            :error-message="errorMessage"
            :can-manage="true"
            show-user-count
            @view="onView"
            @edit="openEdit"
            @delete="openDelete"
          />

          <p class="text-meta">
            Perubahan permission berlaku saat token user yang terdampak diperbarui (maksimal 15
            menit). Permission system administration terkunci untuk Super Admin.
          </p>
        </div>
      </ComponentCard>
    </div>

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
      :catalog="catalog"
      :catalog-loading="catalogLoading"
      :catalog-error="catalogError"
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
