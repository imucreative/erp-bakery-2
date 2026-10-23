<script setup lang="ts">
/**
 * GoodsReceiptHeaderFields — header inputs for the Goods Receipt form:
 * source Purchase Order (APPROVED only), receive date, and notes. Stateless
 * view: values flow via v-model (purchaseOrderId / receiveDate / notes) so the
 * parent form owns state, validation, and submission.
 *
 * The supplier and destination outlet are inherited from the chosen PO on the
 * backend; here they are shown read-only via `supplierLabel` /
 * `destinationOutletLabel`. `disabled` renders the read-only mode and
 * `poLocked` locks the PO select (edit mode — the source PO can't change).
 */
import type { PurchaseOrder } from '@/services/purchase-order.service'
import { computed } from 'vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { BaseInput, BaseTextarea } from '@/components/ui'

const props = defineProps<{
  purchaseOrderId: string
  receiveDate: string
  notes: string
  approvedOrders: PurchaseOrder[]
  poNumber: (id: string) => string
  supplierLabel: string
  destinationOutletLabel: string
  disabled: boolean
  poLocked: boolean
}>()

const emit = defineEmits<{
  (e: 'update:purchaseOrderId', value: string): void
  (e: 'update:receiveDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const labelClass = 'form-label'

const selectedPoLabel = computed<string>(() =>
  props.purchaseOrderId ? props.poNumber(props.purchaseOrderId) : '',
)

/** Either read-only flag locks the PR picker; the supplier picker only honours `disabled`. */
const poPickerDisabled = computed<boolean>(() => props.disabled || props.poLocked)
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source Purchase Order -->
      <div>
        <label :class="labelClass">PO Sumber<span class="text-error-500">*</span></label>
        <EntityCombobox
          :model-value="props.purchaseOrderId"
          :selected-label="selectedPoLabel"
          :items="props.approvedOrders"
          :item-id="(po) => po.id"
          :item-label="(po) => po.poNumber"
          mode="client"
          placeholder="Ketik nomor PO..."
          empty-text="PO disetujui tidak ditemukan."
          aria-label="Purchase Order sumber"
          :disabled="poPickerDisabled"
          @update:model-value="emit('update:purchaseOrderId', $event)"
        />

        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Hanya PO berstatus disetujui yang dapat diterima.
        </p>
      </div>

      <!-- Receive Date -->
      <div>
        <label :class="labelClass">Tanggal Terima<span class="text-error-500">*</span></label>
        <BaseInput
          id="goods-receipt-date"
          :model-value="props.receiveDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:receiveDate', $event)"
        />
      </div>

      <!-- Supplier (inherited from PO, read-only) -->
      <div>
        <label :class="labelClass">Vendor</label>
        <div
          class="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ props.supplierLabel || 'Diwarisi dari PO sumber' }}
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Diwarisi dari PO sumber (tidak dapat diubah).
        </p>
      </div>

      <!-- Destination outlet (inherited from PO, read-only) -->
      <div>
        <label :class="labelClass">Outlet Tujuan</label>
        <div
          class="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ props.destinationOutletLabel || 'Diwarisi dari PO sumber' }}
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Diwarisi dari PO sumber (tidak dapat diubah).
        </p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="goods-receipt-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk GR ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
