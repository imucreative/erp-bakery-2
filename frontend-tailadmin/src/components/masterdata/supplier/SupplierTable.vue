<script setup lang="ts">
/**
 * SupplierTable — presentational table for the supplier list. Row actions are
 * compact icon-only buttons (aria-label + title) per the master-module UI
 * standard. Emits edit/delete; renders loading / error / empty states.
 */
import { Pencil, Trash2 } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
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
      Belum ada supplier.
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
              PIC
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Telepon
            </th>
            <th
              class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400"
            >
              Payment Term
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
            v-for="supplier in items"
            :key="supplier.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ supplier.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ supplier.picName || '—' }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ supplier.phone || '—' }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              <span v-if="supplier.defaultPaymentTermCode">
                {{ supplier.defaultPaymentTermCode }}
                <span
                  v-if="supplier.defaultPaymentTermName"
                  class="text-gray-400 dark:text-gray-500"
                >
                  — {{ supplier.defaultPaymentTermName }}
                </span>
              </span>
              <span v-else>—</span>
            </td>
            <td class="px-5 py-4">
              <Badge :color="supplier.isActive ? 'success' : 'error'">
                {{ supplier.isActive ? 'Aktif' : 'Nonaktif' }}
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
                  class="text-error-500 ring-error-200 hover:bg-error-50 hover:text-error-600 dark:ring-error-500/30 dark:hover:bg-white/[0.03]"
                  @click="$emit('delete', supplier)"
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
