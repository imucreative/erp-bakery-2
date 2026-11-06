<script setup lang="ts">
/**
 * PlatformUserTable — presentational table for cross-tenant user management.
 * The page owns fetching and mutations; this component only renders rows and
 * emits edit/delete actions.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { PlatformUserItem } from '@/services/platform.service'

defineProps<{
  items: PlatformUserItem[]
  loading: boolean
  errorMessage: string | null
  deletingId: string | null
}>()

const emit = defineEmits<{
  (event: 'edit', user: PlatformUserItem): void
  (event: 'delete', user: PlatformUserItem): void
}>()

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada user."
    aria-label="Daftar user platform"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Email</BaseTableHead>
        <BaseTableHead>Company</BaseTableHead>
        <BaseTableHead>Role</BaseTableHead>
        <BaseTableHead>Super Admin</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead>Dibuat</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="user in items" :key="user.id">
        <BaseTableCell emphasis="medium">{{ user.name }}</BaseTableCell>
        <BaseTableCell emphasis="mono">{{ user.email }}</BaseTableCell>
        <BaseTableCell>{{ user.companyName || '— (platform)' }}</BaseTableCell>
        <BaseTableCell>{{ user.roleName || user.roleCode || '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge v-if="user.isSuperAdmin" color="primary">Ya</Badge>
          <span v-else class="text-muted-xs">—</span>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="user.isActive ? 'success' : 'error'">
            {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell>{{ formatDate(user.createdAt) }}</BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <template v-if="!user.isSuperAdmin">
              <BaseButton
                size="sm"
                variant="outline"
                icon-only
                aria-label="Edit"
                title="Edit"
                @click="emit('edit', user)"
              >
                <Pencil class="h-4 w-4" aria-hidden="true" />
              </BaseButton>
              <BaseButton
                size="sm"
                variant="danger"
                icon-only
                aria-label="Hapus"
                title="Hapus"
                :disabled="deletingId === user.id"
                @click="emit('delete', user)"
              >
                <Trash2 class="h-4 w-4" aria-hidden="true" />
              </BaseButton>
            </template>
            <span v-else class="text-muted-xs">—</span>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
