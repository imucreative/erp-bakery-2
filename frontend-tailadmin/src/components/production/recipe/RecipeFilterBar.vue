<script setup lang="ts">
/**
 * RecipeFilterBar — search (name/recipeNumber) + status filter + finished
 * product filter toolbar for the Recipe list. Native selects wrapped with a
 * ChevronDownIcon per the UI standard. Two-way binds `search`, `status`, and
 * `product` via v-model:search / v-model:status / v-model:product. Product
 * options (finished products) are resolved once by the parent.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { RECIPE_STATUSES, RECIPE_STATUS_LABELS } from '@/services/recipe.service'
import type { StatusFilter } from '@/composables/useRecipes'

interface ProductOption {
  id: string
  label: string
}

defineProps<{
  search: string
  status: StatusFilter
  product: string
  products: ProductOption[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:product', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <input
        :value="search"
        type="text"
        placeholder="Cari nama / nomor resep..."
        class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <select
        :value="status"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value as StatusFilter)"
      >
        <option value="all">Semua Status</option>
        <option v-for="s in RECIPE_STATUSES" :key="s" :value="s">
          {{ RECIPE_STATUS_LABELS[s] }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-64">
      <select
        :value="product"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:product', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Produk Jadi</option>
        <option v-for="p in products" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
