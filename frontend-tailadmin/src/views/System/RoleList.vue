<script setup lang="ts">
/**
 * RoleList — read-only Roles page (System Administration). Lists roles and lets
 * the user inspect a role's permissions in a modal. No create/edit/delete:
 * roles are seed-controlled (ADR-0015).
 */
import { onMounted, ref } from 'vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import Badge from '@/components/ui/Badge.vue'
import RoleTable from '@/components/system/role/RoleTable.vue'
import RoleDetailModal from '@/components/system/role/RoleDetailModal.vue'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/services/role.service'

const pageTitle = 'Roles'

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
} = useRoles()

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

onMounted(() => {
  void fetchList()
})
</script>

<template>
  <AdminLayout>
    <PageBreadcrumb :pageTitle="pageTitle" />

    <ComponentCard title="Roles" desc="Daftar role beserta permission-nya (read-only).">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="relative w-full sm:max-w-xs">
          <input
            v-model="search"
            type="text"
            placeholder="Cari role..."
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          />
        </div>
        <Badge color="light">Read-only</Badge>
      </div>

      <RoleTable
        :items="filtered"
        :loading="loading"
        :error-message="errorMessage"
        @view="onView"
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
  </AdminLayout>
</template>
