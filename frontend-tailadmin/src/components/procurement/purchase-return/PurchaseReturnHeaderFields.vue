<script setup lang="ts">
/**
 * PurchaseReturnHeaderFields — header inputs for the Purchase Return form:
 * source Goods Receipt (COMPLETED only), return date, and notes. Stateless
 * view: values flow via v-model (goodsReceiptId / returnDate / notes) so the
 * parent form owns state, validation, and submission.
 *
 * The supplier and destination outlet are inherited from the chosen GR on the
 * backend; here they are shown read-only via `supplierLabel` / `outletLabel`.
 * `disabled` renders the read-only mode and `grLocked` locks the GR select
 * (edit mode — the source GR can't change).
 */
import type { GoodsReceipt } from '@/services/goods-receipt.service'
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'

const props = defineProps<{
  goodsReceiptId: string
  returnDate: string
  notes: string
  completedReceipts: GoodsReceipt[]
  grNumber: (id: string) => string
  supplierLabel: string
  outletLabel: string
  disabled: boolean
  grLocked: boolean
}>()

const emit = defineEmits<{
  (e: 'update:goodsReceiptId', value: string): void
  (e: 'update:returnDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const labelClass = 'form-label'
</script>

<template>
  <div class="space-y-6">
    <div class="field-grid">
      <!-- Source Goods Receipt -->
      <div>
        <label :class="labelClass">GR Sumber<span class="text-error-500">*</span></label>
        <BaseSelect
          id="purchase-return-goods-receipt"
          :model-value="props.goodsReceiptId"
          :options="props.completedReceipts.map((gr) => ({ value: gr.id, label: gr.grNumber }))"
          placeholder="Pilih GR (status selesai)"
          :disabled="props.disabled || props.grLocked"
          @update:model-value="emit('update:goodsReceiptId', $event)"
        />
        <p class="mt-1 text-muted-xs">Hanya GR berstatus selesai yang dapat diretur.</p>
      </div>

      <!-- Return Date -->
      <div>
        <label :class="labelClass">Tanggal Retur</label>
        <BaseInput
          id="purchase-return-date"
          :model-value="props.returnDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:returnDate', $event)"
        />
      </div>

      <!-- Supplier (inherited from GR, read-only) -->
      <div>
        <label :class="labelClass">Vendor</label>
        <div class="form-readonly flex h-11 w-full items-center dark:bg-white/[0.02]">
          {{ props.supplierLabel || 'Diwarisi dari GR sumber' }}
        </div>
        <p class="mt-1 text-muted-xs">Diwarisi dari GR sumber (tidak dapat diubah).</p>
      </div>

      <!-- Outlet (inherited from GR, read-only) -->
      <div>
        <label :class="labelClass">Outlet</label>
        <div class="form-readonly flex h-11 w-full items-center dark:bg-white/[0.02]">
          {{ props.outletLabel || 'Diwarisi dari GR sumber' }}
        </div>
        <p class="mt-1 text-muted-xs">Diwarisi dari GR sumber (tidak dapat diubah).</p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="purchase-return-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk retur ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
