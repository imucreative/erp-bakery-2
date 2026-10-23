<script setup lang="ts">
/**
 * StockOpnameHeaderFields — header inputs for the Stock Opname create form:
 * outlet, opname date, and notes. There is no item editor — the backend
 * snapshots the outlet's batches into items on `start`. Stateless view: values
 * flow via v-model (outletId / opnameDate / notes) so the parent form owns
 * state, validation, and submission. `disabled` renders a submitting lock.
 */
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

const props = defineProps<{
  outletId: string
  opnameDate: string
  notes: string
  outlets: Outlet[]
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:outletId', value: string): void
  (e: 'update:opnameDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const labelClass = 'form-label'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Outlet -->
      <div>
        <label :class="labelClass">Outlet<span class="text-error-500">*</span></label>
        <BaseSelect
          id="stock-opname-outlet"
          :model-value="props.outletId"
          :options="props.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))"
          :disabled="props.disabled"
          placeholder="Pilih outlet"
          @update:model-value="emit('update:outletId', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Semua batch aktif outlet dikunci dan di-snapshot menjadi item saat penghitungan dimulai.
        </p>
      </div>

      <!-- Opname Date -->
      <div>
        <label :class="labelClass">Tanggal Opname<span class="text-error-500">*</span></label>
        <BaseInput
          id="stock-opname-date"
          :model-value="props.opnameDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:opnameDate', $event)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="stock-opname-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk opname ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
