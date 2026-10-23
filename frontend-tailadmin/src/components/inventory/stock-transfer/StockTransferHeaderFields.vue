<script setup lang="ts">
/**
 * StockTransferHeaderFields — header inputs for the Stock Transfer form:
 * source outlet (drives the batch picker in the items editor), destination
 * outlet (must differ from source), transfer date, and notes. Stateless view:
 * values flow via v-model (sourceOutletId / destinationOutletId / transferDate
 * / notes) so the parent form owns state, validation, and submission.
 *
 * The source-outlet select is locked once the form already holds item rows
 * (changing it would invalidate the chosen batches); the parent passes
 * `sourceLocked` to express that. `disabled` renders the read-only mode. The
 * destination select excludes the currently chosen source outlet, and an inline
 * warning is shown if a same-outlet selection ever slips through.
 */
import { computed } from 'vue'
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

const props = defineProps<{
  sourceOutletId: string
  destinationOutletId: string
  transferDate: string
  notes: string
  outlets: Outlet[]
  disabled: boolean
  sourceLocked: boolean
}>()

const emit = defineEmits<{
  (e: 'update:sourceOutletId', value: string): void
  (e: 'update:destinationOutletId', value: string): void
  (e: 'update:transferDate', value: string): void
  (e: 'update:notes', value: string): void
}>()

/** Destination options exclude the chosen source outlet. */
const destinationOutlets = computed<Outlet[]>(() =>
  props.outlets.filter((outlet) => outlet.id !== props.sourceOutletId),
)

/** True when source and destination are the same (invalid). */
const sameOutlet = computed<boolean>(
  () => Boolean(props.sourceOutletId) && props.sourceOutletId === props.destinationOutletId,
)

const labelClass = 'form-label'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source outlet -->
      <div>
        <label :class="labelClass">Outlet Sumber<span class="text-error-500">*</span></label>
        <BaseSelect
          id="stock-transfer-source"
          :model-value="props.sourceOutletId"
          :options="props.outlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))"
          :disabled="props.disabled || props.sourceLocked"
          placeholder="Pilih outlet sumber"
          @update:model-value="emit('update:sourceOutletId', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Outlet sumber menentukan batch stok yang dapat dipilih pada item.
          <template v-if="props.sourceLocked">
            Hapus semua item untuk mengganti outlet sumber.
          </template>
        </p>
      </div>

      <!-- Destination outlet -->
      <div>
        <label :class="labelClass">Outlet Tujuan<span class="text-error-500">*</span></label>
        <BaseSelect
          id="stock-transfer-destination"
          :model-value="props.destinationOutletId"
          :options="destinationOutlets.map((outlet) => ({ value: outlet.id, label: outlet.name }))"
          :disabled="props.disabled"
          placeholder="Pilih outlet tujuan"
          @update:model-value="emit('update:destinationOutletId', $event)"
        />
        <p v-if="sameOutlet" class="mt-1 text-theme-xs text-error-500">
          Outlet tujuan harus berbeda dari outlet sumber.
        </p>
      </div>

      <!-- Transfer date -->
      <div>
        <label :class="labelClass">Tanggal Transfer<span class="text-error-500">*</span></label>
        <BaseInput
          id="stock-transfer-date"
          :model-value="props.transferDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:transferDate', $event)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="stock-transfer-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk transfer ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
