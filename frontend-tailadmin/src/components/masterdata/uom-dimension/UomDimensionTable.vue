<script setup lang="ts">
/**
 * UomDimensionTable — presentational table for the global UOM dimension
 * catalog. Emits edit/delete intents; renders loading/error/empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import type { UomDimensionDefinition } from '@/services/uom-dimension.service'

defineProps<{
  items: UomDimensionDefinition[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', dimension: UomDimensionDefinition): void
  (event: 'delete', dimension: UomDimensionDefinition): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada dimensi UOM."
    aria-label="Daftar dimensi UOM"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Kode</BaseTableHead>
        <BaseTableHead>Nama</BaseTableHead>
        <BaseTableHead>Satuan kanonik (terkecil)</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="dimension in items" :key="dimension.code">
        <BaseTableCell emphasis="mono">{{ dimension.code }}</BaseTableCell>
        <BaseTableCell emphasis="medium">{{ dimension.name }}</BaseTableCell>
        <BaseTableCell>
          {{ dimension.canonicalUnitName }}
          <span class="text-meta">({{ dimension.canonicalUnitSymbol }})</span>
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="dimension.isActive ? 'success' : 'error'">
            {{ dimension.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', dimension)"
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
              @click="$emit('delete', dimension)"
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
