<script setup lang="ts">
/**
 * OutletTable — presentational table for the outlet list. `code` is a
 * backend-generated, read-only column. Row actions are compact icon-only
 * buttons (aria-label + title) per the master-module UI standard. Emits
 * edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

defineProps<{
  items: Outlet[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', outlet: Outlet): void
  (event: 'delete', outlet: Outlet): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada outlet."
    aria-label="Daftar outlet"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Kode</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Telepon</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="outlet in items" :key="outlet.id">
        <BaseTableCell emphasis="medium">{{ outlet.code }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ outlet.name }}</BaseTableCell>
        <BaseTableCell>{{ outlet.phone || '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="outlet.isActive ? 'success' : 'error'">
            {{ outlet.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', outlet)"
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
              class="text-error-500 ring-error-200 hover:bg-error-50 hover:text-error-600 dark:ring-error-500/30 dark:hover:bg-white/[0.03]"
              @click="$emit('delete', outlet)"
            >
              <Trash2 class="h-4 w-4" aria-hidden="true" />
            </BaseButton>
            <span v-if="!canManage" class="text-theme-xs text-gray-400 dark:text-gray-500">
              —
            </span>
          </div>
        </BaseTableCell>
      </BaseTableRow>
    </template>
  </BaseTable>
</template>
