<script setup lang="ts">
/**
 * PurchaseReturnFilterBar — search (returnNumber/notes) + status filter +
 * source-GR filter + supplier filter toolbar for the Purchase Return list.
 * Status uses a native select wrapped with a ChevronDownIcon per the UI
 * standard; source GR and supplier are client-side autocompletes
 * (`EntityCombobox`) over the locally loaded lists, where an empty selection
 * means "Semua GR" / "Semua Vendor". Two-way binds `search`, `status`,
 * `goodsReceipt`, and `supplier` via v-model:search / v-model:status /
 * v-model:goodsReceipt / v-model:supplier.
 */
import { computed } from 'vue'
import { BaseInput, BaseSelect } from '@/components/ui'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import {
  PURCHASE_RETURN_STATUSES,
  PURCHASE_RETURN_STATUS_LABELS,
} from '@/services/purchase-return.service'
import type { StatusFilter } from '@/composables/usePurchaseReturns'
import type { GoodsReceipt } from '@/services/goods-receipt.service'
import type { Supplier } from '@/services/supplier.service'

const props = defineProps<{
  search: string
  status: StatusFilter
  goodsReceipt: string
  supplier: string
  goodsReceipts: GoodsReceipt[]
  suppliers: Supplier[]
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
  (event: 'update:goodsReceipt', value: string): void
  (event: 'update:supplier', value: string): void
}>()

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  ...PURCHASE_RETURN_STATUSES.map((status) => ({
    value: status,
    label: PURCHASE_RETURN_STATUS_LABELS[status],
  })),
]

const selectedGoodsReceiptLabel = computed<string>(() => {
  const match = props.goodsReceipts.find((gr) => gr.id === props.goodsReceipt)
  return match?.grNumber ?? ''
})

const selectedSupplierLabel = computed<string>(() => {
  const match = props.suppliers.find((supplier) => supplier.id === props.supplier)
  return match?.name ?? ''
})
</script>

<template>
  <div class="stack-row">
    <div class="relative w-full sm:max-w-xs">
      <BaseInput
        id="purchase-return-search"
        :model-value="search"
        placeholder="Cari nomor retur / catatan..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-48">
      <BaseSelect
        id="purchase-return-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
    <div class="relative w-full sm:w-72">
      <EntityCombobox
        :model-value="goodsReceipt"
        mode="client"
        list-width="content"
        :selected-label="selectedGoodsReceiptLabel"
        :items="goodsReceipts"
        :item-id="(gr: GoodsReceipt) => gr.id"
        :item-label="(gr: GoodsReceipt) => gr.grNumber"
        empty-text="GR tidak ditemukan."
        placeholder="Semua GR"
        aria-label="Filter GR sumber"
        @update:model-value="emit('update:goodsReceipt', $event)"
      />
    </div>
    <div class="relative w-full sm:w-72">
      <EntityCombobox
        :model-value="supplier"
        mode="client"
        list-width="content"
        :selected-label="selectedSupplierLabel"
        :items="suppliers"
        :item-id="(vendor: Supplier) => vendor.id"
        :item-label="(vendor: Supplier) => vendor.name"
        empty-text="Vendor tidak ditemukan."
        placeholder="Semua Vendor"
        aria-label="Filter vendor"
        @update:model-value="emit('update:supplier', $event)"
      />
    </div>
  </div>
</template>
