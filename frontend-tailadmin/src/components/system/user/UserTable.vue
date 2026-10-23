<script setup lang="ts">
/**
 * UserTable — presentational table for the user list. Resolves role name via
 * `roleNameById` (rows carry roleId only). Compact icon-only row actions per the
 * UI standard. Emits edit/delete; renders loading/error/empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { User } from '@/services/user.service'

defineProps<{
  items: User[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
  roleNameById: Record<string, string>
}>()

defineEmits<{
  (event: 'edit', user: User): void
  (event: 'delete', user: User): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada user."
    aria-label="Daftar user"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Email</BaseTableHead>
        <BaseTableHead>Role</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="user in items" :key="user.id">
        <BaseTableCell emphasis="medium">{{ user.name }}</BaseTableCell>
        <BaseTableCell>{{ user.email }}</BaseTableCell>
        <BaseTableCell>{{ user.roleId ? roleNameById[user.roleId] || '—' : '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="user.isActive ? 'success' : 'error'">
            {{ user.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="outline"
              icon-only
              aria-label="Edit"
              title="Edit"
              @click="$emit('edit', user)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus"
              title="Hapus"
              @click="$emit('delete', user)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <span v-if="!canManage" class="text-muted-xs"> — </span>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
