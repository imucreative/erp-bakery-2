<script setup lang="ts">
/**
 * ProductTable — presentational table for the product list. Resolves UOM name
 * via `uomNameById` and formats price/type. Compact icon-only row actions per
 * the master-module UI standard. Emits edit/delete; loading/error/empty states.
 */
import { Pencil, Trash2, Ruler, Layers } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { PRODUCT_TYPE_LABELS, type Product } from '@/services/product.service'

defineProps<{
  items: Product[]
  loading: boolean
  errorMessage: string | null
  canManage: boolean
  uomNameById: Record<string, string>
}>()

defineEmits<{
  (event: 'edit', product: Product): void
  (event: 'delete', product: Product): void
  (event: 'conversions', product: Product): void
  (event: 'toppings', product: Product): void
}>()

function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}
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
      Belum ada produk.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              SKU
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nama
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Tipe
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              UOM
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Harga Jual
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
            v-for="product in items"
            :key="product.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-mono text-gray-600 dark:text-gray-300">
              {{ product.sku }}
            </td>
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ product.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ PRODUCT_TYPE_LABELS[product.productType] ?? product.productType }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ uomNameById[product.uomId] || '—' }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-800 dark:text-white/90">
              {{ formatIdr(product.sellingPrice) }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="product.isActive ? 'success' : 'error'">
                {{ product.isActive ? 'Aktif' : 'Nonaktif' }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label="Satuan & Konversi"
                  title="Satuan & Konversi"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('conversions', product)"
                >
                  <Ruler class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Kelola Topping"
                  title="Kelola Topping"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('toppings', product)"
                >
                  <Layers class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  aria-label="Edit"
                  title="Edit"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('edit', product)"
                >
                  <Pencil class="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  v-if="canManage"
                  type="button"
                  aria-label="Hapus"
                  title="Hapus"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-error-500 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 hover:text-error-600 dark:ring-error-500/30 dark:hover:bg-error-500/10"
                  @click="$emit('delete', product)"
                >
                  <Trash2 class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
