<template>
  <ComponentCard title="Filters">
    <div class="field-grid md:grid-cols-5">
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

      <BaseFormField label="Status" fieldId="status">
        <BaseSelect
          id="status"
          v-model="filters.status"
          :options="[
            { label: 'Paid', value: 'PAID' },
            { label: 'Refunded', value: 'REFUNDED' },
            { label: 'Cancelled', value: 'CANCELLED' },
          ]"
        />
      </BaseFormField>

      <BaseFormField label="Jumlah Produk" fieldId="topProductsLimit">
        <BaseSelect
          id="topProductsLimit"
          :model-value="String(filters.topProductsLimit)"
          :options="topProductsLimitOptions"
          @update:model-value="onTopProductsLimitChange"
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
import { BaseButton, BaseFormField, BaseInput, BaseSelect } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { useEntityAutocomplete } from '@/composables/useEntityAutocomplete'
import { outletService, type Outlet } from '@/services/outlet.service'
import type { SalesReportFilters, SalesReportTopProductsLimit } from '@/services/reports.service'

const props = defineProps<{
  filters: SalesReportFilters
  loading?: boolean
}>()

const emit = defineEmits<{
  apply: []
}>()

const topProductsLimitOptions = [5, 10, 20, 50].map((limit) => ({
  label: String(limit),
  value: String(limit),
}))

const dateFromError = computed(() => (props.filters.dateFrom ? null : 'Date required'))

const dateToError = computed(() => {
  if (!props.filters.dateTo) return 'Date required'
  if (props.filters.dateTo < props.filters.dateFrom) return 'End date must be after start date'
  return null
})

function onTopProductsLimitChange(value: string | number): void {
  const limit = Number(value)
  if (limit === 5 || limit === 10 || limit === 20 || limit === 50) {
    props.filters.topProductsLimit = limit as SalesReportTopProductsLimit
  }
}

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
</script>
