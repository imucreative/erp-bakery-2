<script setup lang="ts">
/**
 * RecipeItemsTable — read-only ingredient line-items table for a Recipe detail
 * view. Columns: Bahan, Qty, UOM, Loss %. Pure presentation: resolves
 * ingredient product / UOM ids → names via injected resolver callbacks.
 */
import { formatNumber } from '@/lib/format'
import type { Recipe } from '@/services/recipe.service'

const props = defineProps<{
  recipe: Recipe
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
    <table class="min-w-full">
      <thead>
        <tr class="border-b border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-white/[0.02]">
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Bahan
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Qty
          </th>
          <th class="px-4 py-3 text-start text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            UOM
          </th>
          <th class="px-4 py-3 text-end text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400">
            Loss %
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in props.recipe.items"
          :key="item.id"
          class="border-b border-gray-100 last:border-0 dark:border-gray-800"
        >
          <td class="px-4 py-3 text-theme-sm text-gray-800 dark:text-white/90">
            {{ props.productName(item.ingredientProductId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-white/90">
            {{ formatNumber(item.qty) }}
          </td>
          <td class="px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
            {{ item.uomName || props.uomName(item.uomId) }}
          </td>
          <td class="px-4 py-3 text-end text-theme-sm text-gray-600 dark:text-gray-300">
            {{ formatNumber(item.lossPercentage) }}%
          </td>
        </tr>
        <tr v-if="props.recipe.items.length === 0">
          <td
            colspan="4"
            class="px-4 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
          >
            Resep ini tidak memiliki bahan.
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
