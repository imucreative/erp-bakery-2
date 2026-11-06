<template>
  <AdminLayout>
    <PageBreadcrumb pageTitle="Platform Users" />

    <div class="space-y-6">
      <ComponentCard
        title="Users"
        desc="Kelola user lintas perusahaan. Halaman ini hanya untuk Super Admin."
      >
        <div class="toolbar-row">
          <div class="stack-row">
            <div class="w-full sm:max-w-xs">
              <BaseInput
                id="user-search"
                :model-value="search"
                placeholder="Cari nama atau email..."
                @update:model-value="onSearchInput"
              />
            </div>
            <div class="w-full sm:max-w-xs">
              <BaseSelect
                id="user-company"
                :model-value="companyId"
                :options="companyOptions"
                @update:model-value="onCompanyChange"
              />
            </div>
          </div>
          <BaseButton size="sm" variant="primary" @click="openCreate">
            <template #start-icon>
              <Plus class="h-4 w-4" aria-hidden="true" />
            </template>
            Tambah User
          </BaseButton>
        </div>

        <PlatformUserTable
          :items="items"
          :loading="loading"
          :error-message="errorMessage"
          :deleting-id="deletingId"
          @edit="openEdit"
          @delete="remove"
        />

        <BaseTablePagination
          v-if="!loading && !errorMessage && items.length > 0"
          :current-count="items.length"
          :total-items="meta.total"
          :current-page="meta.page"
          :total-pages="meta.totalPages"
          :has-previous="meta.page > 1"
          :has-next="meta.page < meta.totalPages"
          @previous="goToPage(meta.page - 1)"
          @next="goToPage(meta.page + 1)"
        />
      </ComponentCard>
    </div>
    <PlatformUserFormModal
      :open="formOpen"
      :mode="formMode"
      :user="selectedUser"
      :companies="assignableCompanyOptions"
      :submitting="saving"
      :error-message="formError"
      @close="closeForm"
      @submit="submitForm"
    />
    <PlatformUserDeleteModal
      :open="deleteOpen"
      :user="deleteTarget"
      :deleting="deletingId !== null"
      :error-message="deleteError"
      @close="closeDelete"
      @confirm="confirmDelete"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseInput, BaseSelect, BaseTablePagination } from '@/components/ui'
import PlatformUserTable from '@/components/platform/PlatformUserTable.vue'
import PlatformUserDeleteModal from '@/components/platform/PlatformUserDeleteModal.vue'
import type { PlatformUserItem } from '@/services/platform.service'
import PlatformUserFormModal, {
  type PlatformUserFormPayload,
} from '@/components/platform/PlatformUserFormModal.vue'
import { usePlatformUsers } from '@/composables/usePlatformUsers'
import { Plus } from 'lucide-vue-next'
import { toMessage } from '@/lib/errors'

const {
  items,
  meta,
  search,
  companyId,
  companyOptions,
  assignableCompanyOptions,
  loading,
  errorMessage,
  load,
  loadCompanies,
  onSearchInput,
  onCompanyChange,
  goToPage,
  createUser,
  updateUser,
  deleteUser,
} = usePlatformUsers()

const formOpen = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const selectedUser = ref<PlatformUserItem | null>(null)
const saving = ref(false)
const formError = ref<string | null>(null)
const deletingId = ref<string | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<PlatformUserItem | null>(null)
const deleteError = ref<string | null>(null)

function openCreate(): void {
  formMode.value = 'create'
  selectedUser.value = null
  formError.value = null
  formOpen.value = true
}

function openEdit(item: PlatformUserItem): void {
  if (item.isSuperAdmin) {
    errorMessage.value = 'Akun Super Admin tidak dapat diubah dari platform console.'
    return
  }
  formMode.value = 'edit'
  selectedUser.value = item
  formError.value = null
  formOpen.value = true
}

function closeForm(): void {
  if (!saving.value) formOpen.value = false
}

async function submitForm(payload: PlatformUserFormPayload): Promise<void> {
  saving.value = true
  formError.value = null
  try {
    if (formMode.value === 'create') {
      if (!payload.email || !payload.password) throw new Error('Data user belum lengkap.')
      await createUser({
        name: payload.name,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        companyId: payload.companyId,
        roleId: payload.roleId,
      })
    } else if (selectedUser.value) {
      await updateUser(selectedUser.value.id, {
        name: payload.name,
        phone: payload.phone,
        companyId: payload.companyId,
        roleId: payload.roleId,
        isActive: payload.isActive,
      })
    }
    formOpen.value = false
  } catch (error) {
    formError.value = toMessage(error)
  } finally {
    saving.value = false
  }
}

function remove(item: PlatformUserItem): void {
  if (item.isSuperAdmin) return
  deleteTarget.value = item
  deleteError.value = null
  deleteOpen.value = true
}

function closeDelete(): void {
  if (deletingId.value === null) {
    deleteOpen.value = false
    deleteTarget.value = null
  }
}

async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return
  const target = deleteTarget.value
  deletingId.value = target.id
  deleteError.value = null
  try {
    await deleteUser(target.id)
    deleteOpen.value = false
    deleteTarget.value = null
  } catch (error) {
    deleteError.value = toMessage(error)
  } finally {
    deletingId.value = null
  }
}

onMounted(() => {
  void loadCompanies()
  void load()
})
</script>
