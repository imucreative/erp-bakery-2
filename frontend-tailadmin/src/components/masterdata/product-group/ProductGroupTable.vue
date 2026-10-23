<script setup lang="ts">
/**
 * ProductGroupTable — presentational table for the product-group list.
 * Compact icon-only row actions (aria-label + title) per the master-module UI
 * standard. Emits edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { ProductGroup } from '@/services/product-group.service'

defineProps<{
  items: ProductGroup[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', group: ProductGroup): void
  (event: 'delete', group: ProductGroup): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada grup produk."
    aria-label="Daftar grup produk"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Deskripsi</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="group in items" :key="group.id">
        <BaseTableCell emphasis="medium">{{ group.name }}</BaseTableCell>
        <BaseTableCell>{{ group.description || '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="group.isActive ? 'success' : 'error'">
            {{ group.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', group)"
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
              @click="$emit('delete', group)"
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
