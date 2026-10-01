<script setup lang="ts">
/**
 * PurchaseRequestHeaderFields — header inputs for the Purchase Request form:
 * destination outlet, needed date, and notes. Stateless view: values flow via
 * v-model (destinationOutletId / expectedDate / notes) so the parent form owns
 * state, validation, and submission. `disabled` renders the read-only mode.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <option v-for="o in props.outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>
      <div>
        <label :class="labelClass">Tanggal Dibutuhkan<span class="text-error-500">*</span></label>
        <input
          :value="props.expectedDate"
          type="date"
          :min="props.minDate"
          :disabled="props.disabled"
          :class="inputClass"
          @input="emit('update:expectedDate', ($event.target as HTMLInputElement).value)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Harus besok atau setelahnya.
        </p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk PR ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
