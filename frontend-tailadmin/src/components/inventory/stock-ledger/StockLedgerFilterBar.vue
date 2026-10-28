<script setup lang="ts">
import { computed } from 'vue'
import { BaseFormField, BaseInput, BaseSelect } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
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

const props = defineProps<{
  outletId: string
  productId: string
  movementType: string
  dateFrom: string
  dateTo: string
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
  (event: 'update:movementType', value: string): void
  (event: 'update:dateFrom', value: string): void
  (event: 'update:dateTo', value: string): void
}>()
</script>

<template>
  <div class="stack-row w-full sm:flex-wrap sm:items-end">
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

    <BaseFormField
      label="Dari Tanggal (WIB)"
      field-id="stock-ledger-date-from"
      class="w-full sm:w-56"
    >
      <BaseInput
        id="stock-ledger-date-from"
        type="date"
        :model-value="dateFrom"
        :max="dateTo || undefined"
        @update:model-value="emit('update:dateFrom', $event)"
      />
    </BaseFormField>

    <BaseFormField
      label="Sampai Tanggal (WIB)"
      field-id="stock-ledger-date-to"
      class="w-full sm:w-56"
    >
      <BaseInput
        id="stock-ledger-date-to"
        type="date"
        :model-value="dateTo"
        :min="dateFrom || undefined"
        @update:model-value="emit('update:dateTo', $event)"
      />
    </BaseFormField>
  </div>
</template>
