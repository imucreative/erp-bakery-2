<script setup lang="ts">
/**
 * PurchaseRequestHeaderFields — header inputs for the Purchase Request form:
 * destination outlet, needed date, and notes. Stateless view: values flow via
 * v-model (destinationOutletId / expectedDate / notes) so the parent form owns
 * state, validation, and submission. `disabled` renders the read-only mode.
 */
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

const props = defineProps<{
  destinationOutletId: string
  expectedDate: string
  notes: string
  outlets: Outlet[]
  minDate: string
  disabled: boolean
}>()

const emit = defineEmits<{
  (e: 'update:destinationOutletId', value: string): void
  (e: 'update:expectedDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

const labelClass = 'form-label'

const outletOptions = (outlets: Outlet[]) =>
  outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))
</script>

<template>
  <div class="space-y-6">
    <div class="field-grid">
      <div>
        <label :class="labelClass">Outlet Tujuan<span class="text-error-500">*</span></label>
        <BaseSelect
          id="purchase-request-destination-outlet"
          :model-value="props.destinationOutletId"
          :options="outletOptions(props.outlets)"
          :disabled="props.disabled"
          placeholder="Pilih outlet tujuan"
          @update:model-value="emit('update:destinationOutletId', $event)"
        />
      </div>
      <div>
        <label :class="labelClass">Tanggal Dibutuhkan<span class="text-error-500">*</span></label>
        <BaseInput
          id="purchase-request-expected-date"
          :model-value="props.expectedDate"
          type="date"
          :min="props.minDate"
          :disabled="props.disabled"
          @update:model-value="emit('update:expectedDate', $event)"
        />
        <p class="mt-1 text-muted-xs">Harus besok atau setelahnya.</p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="purchase-request-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk PR ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
