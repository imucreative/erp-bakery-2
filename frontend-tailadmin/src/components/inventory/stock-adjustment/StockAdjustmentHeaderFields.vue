<script setup lang="ts">
/**
 * StockAdjustmentHeaderFields — header inputs for the Stock Adjustment form:
 * outlet (which drives the batch picker in the items editor), adjustment date,
 * and notes. Stateless view: values flow via v-model (outletId / adjustmentDate
 * / notes) so the parent form owns state, validation, and submission.
 *
 * The outlet select is locked once the form already holds item rows (changing
 * the outlet would invalidate the chosen batches); the parent passes
 * `outletLocked` to express that. `disabled` renders the read-only mode.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import type { Outlet } from '@/services/outlet.service'

const props = defineProps<{
  outletId: string
  adjustmentDate: string
  notes: string
  outlets: Outlet[]
  disabled: boolean
  outletLocked: boolean
}>()

const emit = defineEmits<{
  (e: 'update:outletId', value: string): void
  (e: 'update:adjustmentDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.outletId"
            :disabled="props.disabled || props.outletLocked"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:outletId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih outlet</option>
            <option v-for="outlet in props.outlets" :key="outlet.id" :value="outlet.id">
              {{ outlet.name }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Outlet menentukan batch stok yang dapat dipilih pada item.
          <template v-if="props.outletLocked">
            Hapus semua item untuk mengganti outlet.
          </template>
        </p>
      </div>

      <!-- Adjustment Date -->
      <div>
        <label :class="labelClass">Tanggal Penyesuaian<span class="text-error-500">*</span></label>
        <input
          :value="props.adjustmentDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:adjustmentDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk penyesuaian ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
