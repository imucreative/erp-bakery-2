<script setup lang="ts">
/**
 * UomFilterBar — search + dimension filter for the UOM list, laid out as a
 * `stack-row` of `BaseInput`/`BaseSelect`. Two-way binds `search` and
 * `dimension` via v-model:search / v-model:dimension. The parent owns the
 * `toolbar-row` that pairs this bar with the Kelola Dimensi / Tambah UOM
 * buttons, so the actions never move with the filters.
 */
import { BaseInput, BaseSelect } from '@/components/ui'

defineProps<{
  search: string
  dimension: string
  dimensionOptions: { label: string; value: string }[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:dimension', value: string): void
}>()
</script>

<template>
  <div class="stack-row w-full sm:w-auto">
    <div class="w-full sm:w-80">
      <BaseInput
        id="uom-search"
        :model-value="search"
        placeholder="Cari satuan..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="w-full sm:w-[220px]">
      <BaseSelect
        id="uom-dimension-filter"
        :model-value="dimension"
        :options="dimensionOptions"
        aria-label="Filter dimensi"
        @update:model-value="emit('update:dimension', $event)"
      />
    </div>
  </div>
</template>
