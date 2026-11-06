<template>
  <ComponentCard title="Filters">
    <div class="field-grid md:grid-cols-3">
      <BaseFormField label="Outlet" field-id="outletId">
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

      <BaseFormField label="Product" field-id="productId">
        <EntityCombobox
          :model-value="filters.productId"
          :selected-label="productSelectedLabel"
          :items="productResults"
          :item-id="(product: Product) => product.id"
          :item-label="(product: Product) => `${product.name} (${product.sku})`"
          :searching="productSearching"
          searching-text="Mencari..."
          empty-text="Produk tidak ditemukan."
          placeholder="All Products"
          aria-label="Pilih produk"
          @update:model-value="filters.productId = $event"
          @search="onProductSearch"
          @select="onProductSelect"
          @clear="onProductClear"
        />
      </BaseFormField>

      <BaseFormField label="Include Expired" field-id="includeExpired">
        <ToggleSwitch
          id="includeExpired"
          v-model="filters.includeExpired"
          label="Show expired batches"
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
import ComponentCard from '@/components/common/ComponentCard.vue'
import { BaseButton, BaseFormField } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useEntityAutocomplete } from '@/composables/useEntityAutocomplete'
import { outletService, type Outlet } from '@/services/outlet.service'
import { productService, type Product } from '@/services/product.service'
import type { InventoryReportFilters } from '@/services/reports.service'

defineProps<{
  filters: InventoryReportFilters
  loading?: boolean
}>()

const emit = defineEmits<{
  apply: []
}>()

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
  results: productResults,
  searching: productSearching,
  selectedLabel: productSelectedLabel,
  onSearch: onProductSearch,
  onSelect: onProductSelect,
  onClear: onProductClear,
} = useEntityAutocomplete<Product>({
  search: async (query) => (await productService.list({ page: 1, limit: 50, search: query })).items,
  label: (product) => `${product.name} (${product.sku})`,
})
</script>
