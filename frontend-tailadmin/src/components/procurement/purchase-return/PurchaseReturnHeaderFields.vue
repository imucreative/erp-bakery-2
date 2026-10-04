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
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import type { GoodsReceipt } from '@/services/goods-receipt.service'

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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source Goods Receipt -->
      <div>
        <label :class="labelClass">GR Sumber<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.goodsReceiptId"
            :disabled="props.disabled || props.grLocked"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:goodsReceiptId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih GR (status selesai)</option>
            <option v-for="gr in props.completedReceipts" :key="gr.id" :value="gr.id">
              {{ gr.grNumber }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Hanya GR berstatus selesai yang dapat diretur.
        </p>
      </div>

      <!-- Return Date -->
      <div>
        <label :class="labelClass">Tanggal Retur</label>
        <input
          :value="props.returnDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:returnDate', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Supplier (inherited from GR, read-only) -->
      <div>
        <label :class="labelClass">Vendor</label>
        <div
          class="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ props.supplierLabel || 'Diwarisi dari GR sumber' }}
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Diwarisi dari GR sumber (tidak dapat diubah).
        </p>
      </div>

      <!-- Outlet (inherited from GR, read-only) -->
      <div>
        <label :class="labelClass">Outlet</label>
        <div
          class="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ props.outletLabel || 'Diwarisi dari GR sumber' }}
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Diwarisi dari GR sumber (tidak dapat diubah).
        </p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk retur ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
