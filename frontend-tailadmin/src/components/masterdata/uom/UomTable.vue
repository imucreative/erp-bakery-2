<script setup lang="ts">
/**
 * UomTable — presentational table for the UOM list. Emits edit/delete intents
 * to the parent; renders loading / error / empty states. Row actions are
 * compact icon-only buttons (aria-label + title for accessibility/tooltip) to
 * keep the table dense.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Uom } from '@/services/uom.service'

defineProps<{
  items: Uom[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', uom: Uom): void
  (event: 'delete', uom: Uom): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada satuan ukur."
    aria-label="Daftar satuan ukur"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="uom in items" :key="uom.id">
        <BaseTableCell emphasis="medium">{{ uom.name }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="uom.isActive ? 'success' : 'error'">
            {{ uom.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', uom)"
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
              @click="$emit('delete', uom)"
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
