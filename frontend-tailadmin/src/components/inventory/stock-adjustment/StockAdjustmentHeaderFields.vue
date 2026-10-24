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
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
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

const labelClass = 'form-label'
</script>

<template>
  <div class="space-y-6">
    <div class="field-grid">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <BaseSelect
          id="stock-adjustment-outlet"
          :model-value="props.outletId"
          :options="props.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))"
          :disabled="props.disabled || props.outletLocked"
          placeholder="Pilih outlet"
          @update:model-value="emit('update:outletId', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Outlet menentukan batch stok yang dapat dipilih pada item.
          <template v-if="props.outletLocked"> Hapus semua item untuk mengganti outlet. </template>
        </p>
      </div>

      <!-- Adjustment Date -->
      <div>
        <label :class="labelClass">Tanggal Penyesuaian<span class="text-error-500">*</span></label>
        <BaseInput
          id="stock-adjustment-date"
          :model-value="props.adjustmentDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:adjustmentDate', $event)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="stock-adjustment-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk penyesuaian ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
