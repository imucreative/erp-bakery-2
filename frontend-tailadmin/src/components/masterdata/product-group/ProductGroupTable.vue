<script setup lang="ts">
/**
 * ProductGroupTable — presentational table for the product-group list.
 * Compact icon-only row actions (aria-label + title) per the master-module UI
 * standard. Emits edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
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
      Belum ada grup produk.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nama
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Deskripsi
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Status
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="group in items"
            :key="group.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ group.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ group.description || '—' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="group.isActive ? 'success' : 'error'">
                {{ group.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  v-if="canManage"
                  type="button"
                  aria-label="Edit"
                  title="Edit"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('edit', group)"
                >
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  aria-label="Hapus"
                  title="Hapus"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 hover:text-error-600 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                  @click="$emit('delete', group)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
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
