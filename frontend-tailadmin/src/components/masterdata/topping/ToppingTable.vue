<script setup lang="ts">
/**
 * ToppingTable — presentational table for the GLOBAL topping catalog. Shows the
 * topping (name + SKU), per-item takaran (defaultQtyPerItem + uomCode), harga
 * tambahan (rupiah), status, and compact icon-only row actions. Emits
 * edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
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
      Belum ada topping.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Topping
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Takaran / Item
            </th>
            <th
              class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Harga Tambahan
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
            v-for="topping in items"
            :key="topping.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4">
              <p class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                {{ topping.toppingName }}
              </p>
              <p class="text-theme-xs font-mono text-gray-500 dark:text-gray-400">
                {{ topping.toppingSku }}
              </p>
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ formatQtyWithUom(topping.defaultQtyPerItem, topping.uomName) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-800 dark:text-white/90">
              {{ topping.extraPrice > 0 ? formatRupiah(topping.extraPrice) : 'Gratis' }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="topping.isActive ? 'success' : 'error'">
                {{ topping.isActive ? 'Aktif' : 'Nonaktif' }}
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
