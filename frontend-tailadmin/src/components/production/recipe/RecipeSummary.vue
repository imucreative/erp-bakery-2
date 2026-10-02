<script setup lang="ts">
/**
 * RecipeSummary — read-only header meta card for a Recipe. Renders the status
 * badge, finished product, version, yield (qty + UOM), ingredient count,
 * creation/update time and optional instructions. Pure presentation: resolves
 * product/UOM ids → names via injected resolver callbacks so it never fetches
 * or holds lookup state itself.
 */
import Badge from '@/components/ui/Badge.vue'
import { formatDateTime, formatNumber } from '@/lib/format'
import {
  RECIPE_STATUS_LABELS,
  statusBadgeColor,
  type Recipe,
} from '@/services/recipe.service'

const props = defineProps<{
  recipe: Recipe
  productName: (id: string) => string
  uomName: (id: string) => string
}>()
</script>

<template>
  <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.recipe.status)">
          {{ RECIPE_STATUS_LABELS[props.recipe.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Versi</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        v{{ props.recipe.version }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Produk Jadi</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.productName(props.recipe.productId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Hasil / Batch</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatNumber(props.recipe.yieldQty) }} {{ props.uomName(props.recipe.yieldUomId) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Jumlah Bahan</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ props.recipe.items.length }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Dibuat</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.recipe.createdAt) }}
      </dd>
    </div>
    <div>
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Diperbarui</dt>
      <dd class="mt-1 text-theme-sm text-gray-800 dark:text-white/90">
        {{ formatDateTime(props.recipe.updatedAt) }}
      </dd>
    </div>

    <div v-if="props.recipe.instructions" class="sm:col-span-2">
      <dt class="text-theme-xs uppercase text-gray-400 dark:text-gray-500">Instruksi</dt>
      <dd class="mt-1 whitespace-pre-line text-theme-sm text-gray-700 dark:text-gray-300">
        {{ props.recipe.instructions }}
      </dd>
    </div>
  </dl>
</template>
