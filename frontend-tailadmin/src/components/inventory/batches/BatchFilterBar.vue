<script setup lang="ts">
import { computed } from 'vue'
import { BaseSelect, BaseToggle } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { BATCH_STATUSES, operationalStatusLabel } from '@/services/inventory.service'

interface OutletOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

const props = defineProps<{
  outletId: string
  productId: string
  status: string
  includeNonBatch: boolean
  outlets: OutletOption[]
  products: ProductOption[]
}>()

const productLabel = (product: ProductOption): string => `${product.name} (${product.sku})`
const selectedProductLabel = computed(() => {
  const product = props.products.find((product) => product.id === props.productId)
  return product ? productLabel(product) : ''
})

const emit = defineEmits<{
  (event: 'update:outletId', value: string): void
  (event: 'update:productId', value: string): void
  (event: 'update:status', value: string): void
  (event: 'update:includeNonBatch', value: boolean): void
}>()
</script>

<template>
  <div class="stack-row sm:flex-wrap">
    <div class="w-full sm:w-56">
      <BaseSelect
        id="batch-outlet"
        :model-value="outletId"
        :options="[
          { value: '', label: 'Semua Outlet' },
          ...outlets.map((outlet) => ({ value: outlet.id, label: outlet.name })),
        ]"
        @update:model-value="emit('update:outletId', $event)"
      />
    </div>

    <div class="w-full sm:w-64">
      <EntityCombobox
        :model-value="productId"
        :selected-label="selectedProductLabel"
        :items="products"
        :item-id="(product) => product.id"
        :item-label="productLabel"
        mode="client"
        placeholder="Semua Produk — cari nama / SKU..."
        aria-label="Filter produk"
        clear-aria-label="Hapus filter produk"
        @update:model-value="emit('update:productId', $event)"
      />
    </div>

    <div class="w-full sm:w-96">
      <label for="batch-status" class="sr-only">Status Operasional</label>
      <BaseSelect
        id="batch-status"
        aria-label="Status Operasional"
        :model-value="status"
        :options="[
          { value: '', label: 'Semua Status Operasional' },
          ...BATCH_STATUSES.map((value) => ({ value, label: operationalStatusLabel(value) })),
        ]"
        @update:model-value="emit('update:status', $event)"
      />
    </div>

    <BaseToggle
      :model-value="includeNonBatch"
      label="Tampilkan non-batch"
      @update:model-value="emit('update:includeNonBatch', $event)"
    />
  </div>
</template>
