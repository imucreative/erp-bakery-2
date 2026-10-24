<script setup lang="ts">
/**
 * BatchFilterBar — outlet + product + batch-status filters plus an
 * "include non-batch" toggle for the Batch & Expiry list. The three dropdowns
 * are `BaseSelect`; the boolean uses `BaseToggle` (never a checkbox). The bar
 * wraps (`stack-row sm:flex-wrap`) because four controls don't fit one row at
 * mid widths. Two-way binds `outletId`, `productId`, `status`, and
 * `includeNonBatch`. Outlet and product options are resolved once by the parent.
 */
import { BaseSelect, BaseToggle } from '@/components/ui'
import { BATCH_STATUSES, batchStatusLabel } from '@/services/inventory.service'

interface OutletOption {
  id: string
  name: string
}

interface ProductOption {
  id: string
  name: string
  sku: string
}

defineProps<{
  outletId: string
  productId: string
  status: string
  includeNonBatch: boolean
  outlets: OutletOption[]
  products: ProductOption[]
}>()

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
      <BaseSelect
        id="batch-product"
        :model-value="productId"
        :options="[
          { value: '', label: 'Semua Produk' },
          ...products.map((product) => ({
            value: product.id,
            label: `${product.name} (${product.sku})`,
          })),
        ]"
        @update:model-value="emit('update:productId', $event)"
      />
    </div>

    <div class="w-full sm:w-48">
      <BaseSelect
        id="batch-status"
        :model-value="status"
        :options="[
          { value: '', label: 'Semua Status' },
          ...BATCH_STATUSES.map((value) => ({ value, label: batchStatusLabel(value) })),
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
