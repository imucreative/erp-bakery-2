<script setup lang="ts">
/**
 * ProductTypeTable — presentational table for the product-type catalog.
 * Emits edit/delete intents; renders loading/error/empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { ProductTypeOption } from '@/services/product-type.service'

defineProps<{
  items: ProductTypeOption[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', productType: ProductTypeOption): void
  (event: 'delete', productType: ProductTypeOption): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada tipe produk."
    aria-label="Daftar tipe produk"
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
      <BaseTableRow v-for="productType in items" :key="productType.code">
        <BaseTableCell emphasis="mono">{{ productType.code }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ productType.name }}</BaseTableCell>
        <BaseTableCell>
          <span class="text-muted">{{ productType.description || '—' }}</span>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="productType.isActive ? 'success' : 'error'">
            {{ productType.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', productType)"
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
              @click="$emit('delete', productType)"
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
