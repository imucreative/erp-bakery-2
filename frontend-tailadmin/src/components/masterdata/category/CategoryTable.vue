<script setup lang="ts">
/**
 * CategoryTable — presentational table for the category list. Resolves the
 * product-group name via `groupNameById`. Compact icon-only row actions per the
 * master-module UI standard. Emits edit/delete; renders loading/error/empty.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
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
      Belum ada kategori.
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
              Grup Produk
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
            v-for="category in items"
            :key="category.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-mono text-gray-600 dark:text-gray-300">
              {{ category.code }}
            </td>
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ category.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ groupNameById[category.productGroupId] || '—' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="category.isActive ? 'success' : 'error'">
                {{ category.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </td>
            <td class="px-5 py-4">
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
                  class="text-error-500 ring-error-200 hover:bg-error-50 hover:text-error-600 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                  @click="$emit('delete', category)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </BaseButton>
                <span v-if="!canManage" class="text-theme-xs text-gray-400 dark:text-gray-500">
                  —
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
