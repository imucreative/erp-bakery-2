<script setup lang="ts">
/**
 * SupplierTable — presentational table for the supplier list. Row actions are
 * compact icon-only buttons (aria-label + title) per the master-module UI
 * standard. Emits edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { Supplier } from '@/services/supplier.service'

defineProps<{
  items: Supplier[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', supplier: Supplier): void
  (event: 'delete', supplier: Supplier): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada supplier."
    aria-label="Daftar supplier"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>PIC</BaseTableHead>
        <BaseTableHead>Telepon</BaseTableHead>
        <BaseTableHead>Payment Term</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="supplier in items" :key="supplier.id">
        <BaseTableCell emphasis="medium">{{ supplier.name }}</BaseTableCell>
        <BaseTableCell>{{ supplier.picName || '—' }}</BaseTableCell>
        <BaseTableCell>{{ supplier.phone || '—' }}</BaseTableCell>
        <BaseTableCell>
          <span v-if="supplier.defaultPaymentTermCode">
            {{ supplier.defaultPaymentTermCode }}
            <span v-if="supplier.defaultPaymentTermName" class="text-gray-400 dark:text-gray-500">
              — {{ supplier.defaultPaymentTermName }}
            </span>
          </span>
          <span v-else>—</span>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="supplier.isActive ? 'success' : 'error'">
            {{ supplier.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', supplier)"
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
              @click="$emit('delete', supplier)"
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
