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
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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
  () =>
    Boolean(props.sourceOutletId) &&
    props.sourceOutletId === props.destinationOutletId,
)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source outlet -->
      <div>
        <label :class="labelClass">Outlet Sumber<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.sourceOutletId"
            :disabled="props.disabled || props.sourceLocked"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:sourceOutletId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih outlet sumber</option>
            <option v-for="outlet in props.outlets" :key="outlet.id" :value="outlet.id">
              {{ outlet.name }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
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
        <div class="relative">
          <select
            :value="props.destinationOutletId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:destinationOutletId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih outlet tujuan</option>
            <option v-for="outlet in destinationOutlets" :key="outlet.id" :value="outlet.id">
              {{ outlet.name }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p
          v-if="sameOutlet"
          class="mt-1 text-theme-xs text-error-500"
        >
          Outlet tujuan harus berbeda dari outlet sumber.
        </p>
      </div>

      <!-- Transfer date -->
      <div>
        <label :class="labelClass">Tanggal Transfer<span class="text-error-500">*</span></label>
        <input
          :value="props.transferDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:transferDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk transfer ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
