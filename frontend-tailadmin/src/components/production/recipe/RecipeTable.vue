<script setup lang="ts">
/**
 * RecipeTable — presentational table for the Recipe list. Columns: Nomor, Nama,
 * Produk Jadi, Versi, Jumlah Bahan, Status (badge). Row action is icon-only
 * (view/detail). Renders loading / error / empty states. Finished product names
 * are resolved by the parent via an injected resolver callback (fetched once for
 * the whole page). The list rows carry their `items` array, so the ingredient
 * count is shown directly.
 */
import { Eye } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import {
  RECIPE_STATUS_LABELS,
  statusBadgeColor,
  type Recipe,
} from '@/services/recipe.service'

defineProps<{
  items: Recipe[]
  loading: boolean
  errorMessage: string | null
  productName: (id: string) => string
}>()

defineEmits<{
  (event: 'view', recipe: Recipe): void
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
      Belum ada resep.
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-100 dark:border-gray-800">
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nomor
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Nama
            </th>
            <th class="px-5 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Produk Jadi
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Versi
            </th>
            <th class="px-5 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
              Jumlah Bahan
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
            v-for="recipe in items"
            :key="recipe.id"
            class="border-b border-gray-100 dark:border-gray-800"
          >
            <td class="px-5 py-4 text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ recipe.recipeNumber }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-800 dark:text-white/90">
              {{ recipe.name }}
            </td>
            <td class="px-5 py-4 text-theme-sm text-gray-600 dark:text-gray-300">
              {{ productName(recipe.productId) }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              v{{ recipe.version }}
            </td>
            <td class="px-5 py-4 text-end text-theme-sm text-gray-600 dark:text-gray-300">
              {{ recipe.items.length }}
            </td>
            <td class="px-5 py-4">
              <Badge :color="statusBadgeColor(recipe.status)">
                {{ RECIPE_STATUS_LABELS[recipe.status] }}
              </Badge>
            </td>
            <td class="px-5 py-4">
              <div class="flex items-center justify-end gap-2">
                <button
                  type="button"
                  aria-label="Lihat detail"
                  title="Lihat detail"
                  class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 hover:text-gray-700 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
                  @click="$emit('view', recipe)"
                >
                  <Eye class="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
