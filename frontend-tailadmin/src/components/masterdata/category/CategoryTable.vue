<script setup lang="ts">
/**
 * CategoryTable — presentational table for the category list. Resolves the
 * product-group name via `groupNameById`. Compact icon-only row actions per the
 * master-module UI standard. Emits edit/delete; renders loading/error/empty.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Category } from '@/services/category.service'

defineProps<{
  items: Category[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
  groupNameById: Record<string, string>
}>()

defineEmits<{
  (event: 'edit', category: Category): void
  (event: 'delete', category: Category): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada kategori."
    aria-label="Daftar kategori"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Kode</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Grup Produk</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="category in items" :key="category.id">
        <BaseTableCell emphasis="mono">{{ category.code }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ category.name }}</BaseTableCell>
        <BaseTableCell>{{ groupNameById[category.productGroupId] || '—' }}</BaseTableCell>
        <BaseTableCell>
          <Badge :color="category.isActive ? 'success' : 'error'">
            {{ category.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', category)"
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
              @click="$emit('delete', category)"
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
