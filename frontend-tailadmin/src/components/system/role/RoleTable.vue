<script setup lang="ts">
/**
 * RoleTable — roles table with icon-only row actions (view / edit / delete),
 * per the master-module UI standard. Edit/Delete are hidden when the user
 * lacks `role.manage`; Delete is also hidden for OWNER (backend rejects it —
 * ADR 49). Renders loading / error / empty states.
 */
import { Eye, Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
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
  <div>
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      Memuat data...
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      {{ errorMessage }}
    </div>

    <div
      v-else-if="items.length === 0"
      class="py-10 text-center text-sm text-gray-500 dark:text-gray-400"
    >
      Belum ada role.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Kode
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Nama
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Deskripsi
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Status
            </th>
            <th
              class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="role in items"
            :key="role.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-mono text-gray-600 dark:text-gray-300">
              {{ role.code }}
            </td>
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ role.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ role.description || '—' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="role.isActive ? 'success' : 'error'">
                {{ role.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </td>
            <td class="px-5 py-4">
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
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
