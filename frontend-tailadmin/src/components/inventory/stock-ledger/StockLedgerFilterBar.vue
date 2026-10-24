<script setup lang="ts">
/**
 * StockLedgerFilterBar — outlet + product + movement-type filters for the Stock
 * Ledger list. All three are native selects wrapped with a ChevronDownIcon per
 * the UI standard. The ledger has no backend text search, so there is no search
 * input. Two-way binds `outletId`, `productId`, and `movementType`. Outlet and
 * product options are resolved once by the parent.
 */
import { BaseSelect } from '@/components/ui'
import { MOVEMENT_TYPES, movementTypeLabel } from '@/services/inventory.service'

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
  movementType: string
  outlets: OutletOption[]
  products: ProductOption[]
}>()

const emit = defineEmits<{
  (event: 'update:outletId', value: string): void
  (event: 'update:productId', value: string): void
  (event: 'update:movementType', value: string): void
}>()
</script>

<template>
  <div class="stack-row">
    <div class="w-full sm:w-56">
      <BaseSelect
        id="stock-ledger-outlet"
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
        id="stock-ledger-product"
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

    <div class="w-full sm:w-56">
      <BaseSelect
        id="stock-ledger-movement-type"
        :model-value="movementType"
        :options="[
          { value: '', label: 'Semua Tipe' },
          ...MOVEMENT_TYPES.map((type) => ({
            value: type,
            label: movementTypeLabel(type),
          })),
        ]"
        @update:model-value="emit('update:movementType', $event)"
      />
    </div>
  </div>
</template>
