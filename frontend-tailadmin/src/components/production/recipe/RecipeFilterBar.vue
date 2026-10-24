<script setup lang="ts">
/**
 * RecipeFilterBar — search (name/recipeNumber) + status filter + finished
 * product filter toolbar for the Recipe list, built on `BaseInput`/`BaseSelect`.
 * Two-way binds `search`, `status`, and `product` via v-model:search /
 * v-model:status / v-model:product. Product options (finished products) are
 * resolved once by the parent.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
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

const statusOptions = [
  { value: 'all' as const, label: 'Semua Status' },
  ...RECIPE_STATUSES.map((status) => ({
    value: status,
    label: RECIPE_STATUS_LABELS[status],
  })),
]
</script>

<template>
  <div class="stack-row">
    <BaseInput
      id="recipe-search"
      :model-value="search"
      type="search"
      placeholder="Cari nama / nomor resep..."
      class="sm:max-w-xs"
      @update:model-value="emit('update:search', $event)"
    />
    <BaseSelect
      id="recipe-status"
      :model-value="status"
      :options="statusOptions"
      class="sm:w-48"
      @update:model-value="emit('update:status', $event as StatusFilter)"
    />
    <BaseSelect
      id="recipe-product"
      :model-value="product"
      :options="products.map((option) => ({ value: option.id, label: option.label }))"
      placeholder="Semua Produk Jadi"
      class="sm:w-64"
      @update:model-value="emit('update:product', $event)"
    />
  </div>
</template>
