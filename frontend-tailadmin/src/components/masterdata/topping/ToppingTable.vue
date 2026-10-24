<script setup lang="ts">
/**
 * ToppingTable — presentational table for the GLOBAL topping catalog. Shows the
 * topping (name + SKU), per-item takaran (defaultQtyPerItem + uomCode), harga
 * tambahan (rupiah), status, and compact icon-only row actions. Emits
 * edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton, BaseTable, BaseTableCell, BaseTableHead, BaseTableRow } from '@/components/ui'
import { formatRupiah, formatQtyWithUom } from '@/lib/format'
import type { Topping } from '@/services/topping.service'

defineProps<{
  items: Topping[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
}>()

defineEmits<{
  (event: 'edit', topping: Topping): void
  (event: 'delete', topping: Topping): void
}>()
</script>

<template>
  <BaseTable
    :loading="loading"
    :error-message="errorMessage"
    :is-empty="items.length === 0"
    empty-message="Belum ada topping."
    aria-label="Daftar topping"
  >
    <template #header>
      <BaseTableRow variant="header">
        <BaseTableHead>Topping</BaseTableHead>
        <BaseTableHead>Takaran / Item</BaseTableHead>
        <BaseTableHead align="end">Harga Tambahan</BaseTableHead>
        <BaseTableHead>Status</BaseTableHead>
        <BaseTableHead align="end">Aksi</BaseTableHead>
      </BaseTableRow>
    </template>
    <template #body>
      <BaseTableRow v-for="topping in items" :key="topping.id">
        <BaseTableCell>
          <p class="font-medium text-gray-800 dark:text-white/90">
            {{ topping.toppingName }}
          </p>
          <p class="text-meta font-mono">
            {{ topping.toppingSku }}
          </p>
        </BaseTableCell>
        <BaseTableCell>{{
          formatQtyWithUom(topping.defaultQtyPerItem, topping.uomName)
        }}</BaseTableCell>
        <BaseTableCell align="end" emphasis="medium">
          {{ topping.extraPrice > 0 ? formatRupiah(topping.extraPrice) : 'Gratis' }}
        </BaseTableCell>
        <BaseTableCell>
          <Badge :color="topping.isActive ? 'success' : 'error'">
            {{ topping.isActive ? 'Aktif' : 'Nonaktif' }}
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
              @click="$emit('edit', topping)"
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
              @click="$emit('delete', topping)"
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
