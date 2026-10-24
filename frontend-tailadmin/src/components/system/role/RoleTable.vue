<script setup lang="ts">
/**
 * RoleTable — roles table with icon-only row actions (view / edit / delete),
 * per the master-module UI standard. Edit/Delete are hidden when the user
 * lacks `role.manage`; Delete is also hidden for OWNER (backend rejects it —
 * ADR 49). Renders loading / error / empty states.
 */
import { Eye, Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Role } from '@/services/role.service'

defineProps<{
  items: Role[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'view', role: Role): void
  (event: 'edit', role: Role): void
  (event: 'delete', role: Role): void
}>()

function isOwner(role: Role): boolean {
  return role.code === 'OWNER'
}
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada role."
    aria-label="Daftar role"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Kode</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Deskripsi</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="role in items" :key="role.id">
        <BaseTableCell emphasis="mono">{{ role.code }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ role.name }}</BaseTableCell>
        <BaseTableCell>{{ role.description || '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="role.isActive ? 'success' : 'error'">
            {{ role.isActive ? 'Aktif' : 'Nonaktif' }}
          </Badge>
        </BaseTableCell>
        <BaseTableCell align="end">
          <div class="flex items-center justify-end gap-2">
            <BaseButton
              size="sm"
              variant="outline"
              icon-only
              type="button"
              aria-label="Lihat permission"
              title="Lihat permission"
              @click="$emit('view', role)"
            >
              <Eye class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <BaseButton
              v-if="canManage"
              size="sm"
              variant="outline"
              icon-only
              aria-label="Edit"
              title="Edit"
              @click="$emit('edit', role)"
            >
              <Pencil class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <BaseButton
              v-if="canManage && !isOwner(role)"
              size="sm"
              variant="danger"
              icon-only
              aria-label="Hapus"
              title="Hapus"
              @click="$emit('delete', role)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
