<template>
  <ComponentCard title="Filters">
    <div class="field-grid md:grid-cols-4">
      <BaseFormField label="From" fieldId="dateFrom" :error="dateFromError">
        <BaseInput
          id="dateFrom"
          v-model="filters.dateFrom"
          type="date"
          :error="dateFromError || undefined"
        />
      </BaseFormField>

      <BaseFormField label="To" fieldId="dateTo" :error="dateToError">
        <BaseInput
          id="dateTo"
          v-model="filters.dateTo"
          type="date"
          :error="dateToError || undefined"
        />
      </BaseFormField>

      <BaseFormField label="Outlet" fieldId="outletId">
        <EntityCombobox
          :model-value="filters.outletId"
          :selected-label="outletSelectedLabel"
          :items="outletResults"
          :item-id="(outlet: Outlet) => outlet.id"
          :item-label="(outlet: Outlet) => outlet.name"
          :searching="outletSearching"
          searching-text="Mencari..."
          empty-text="Outlet tidak ditemukan."
          placeholder="All Outlets"
          aria-label="Pilih outlet"
          @update:model-value="filters.outletId = $event"
          @search="onOutletSearch"
          @select="onOutletSelect"
          @clear="onOutletClear"
        />
      </BaseFormField>

      <BaseFormField label="Recipe" fieldId="recipeId">
        <EntityCombobox
          :model-value="filters.recipeId"
          :selected-label="recipeSelectedLabel"
          :items="recipeResults"
          :item-id="(recipe: Recipe) => recipe.id"
          :item-label="(recipe: Recipe) => recipe.name"
          :searching="recipeSearching"
          searching-text="Mencari..."
          empty-text="Resep tidak ditemukan."
          placeholder="All Recipes"
          aria-label="Pilih resep"
          @update:model-value="filters.recipeId = $event"
          @search="onRecipeSearch"
          @select="onRecipeSelect"
          @clear="onRecipeClear"
        />
      </BaseFormField>
    </div>

    <div class="toolbar-row mt-4 sm:justify-end">
      <BaseButton variant="primary" :disabled="loading" @click="emit('apply')">
        {{ loading ? 'Loading...' : 'Apply Filters' }}
      </BaseButton>
    </div>
  </ComponentCard>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseFormField, BaseInput } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { useEntityAutocomplete } from '@/composables/useEntityAutocomplete'
import { outletService, type Outlet } from '@/services/outlet.service'
import { recipeService, type Recipe } from '@/services/recipe.service'
import type { ProductionReportFilters } from '@/services/reports.service'

const props = defineProps<{
  filters: ProductionReportFilters
  loading?: boolean
}>()

const emit = defineEmits<{
  apply: []
}>()

const dateFromError = computed(() => (props.filters.dateFrom ? null : 'Date required'))

const dateToError = computed(() => {
  if (!props.filters.dateTo) return 'Date required'
  if (props.filters.dateTo < props.filters.dateFrom) return 'End date must be after start date'
  return null
})

const {
  results: outletResults,
  searching: outletSearching,
  selectedLabel: outletSelectedLabel,
  onSearch: onOutletSearch,
  onSelect: onOutletSelect,
  onClear: onOutletClear,
} = useEntityAutocomplete<Outlet>({
  search: async (query) => (await outletService.list({ page: 1, limit: 50, search: query })).items,
  label: (outlet) => outlet.name,
})

const {
  results: recipeResults,
  searching: recipeSearching,
  selectedLabel: recipeSelectedLabel,
  onSearch: onRecipeSearch,
  onSelect: onRecipeSelect,
  onClear: onRecipeClear,
} = useEntityAutocomplete<Recipe>({
  search: async (query) => (await recipeService.list({ page: 1, limit: 50, search: query })).items,
  label: (recipe) => recipe.name,
})
</script>
