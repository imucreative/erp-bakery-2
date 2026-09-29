<script setup lang="ts">
/**
 * UomTable — presentational table for the UOM list. Emits edit/delete intents
 * to the parent; renders loading / error / empty states. Action buttons use the
 * shared Button component (outline variant) rather than plain text links.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
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
      Belum ada satuan ukur.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Nama
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
            v-for="uom in items"
            :key="uom.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ uom.name }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="uom.isActive ? 'success' : 'error'">
                {{ uom.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <Button
                  v-if="canManage"
                  size="sm"
                  variant="outline"
                  :start-icon="Pencil"
                  :on-click="() => $emit('edit', uom)"
                >
                  Edit
                </Button>
                <button
                  v-if="canManage"
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600"
                  @click="$emit('delete', uom)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                  Hapus
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
