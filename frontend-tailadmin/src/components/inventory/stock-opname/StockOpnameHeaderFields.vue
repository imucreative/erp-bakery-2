<script setup lang="ts">
/**
 * StockOpnameHeaderFields — header inputs for the Stock Opname create form:
 * outlet, opname date, and notes. There is no item editor — the backend
 * snapshots the outlet's batches into items on `start`. Stateless view: values
 * flow via v-model (outletId / opnameDate / notes) so the parent form owns
 * state, validation, and submission. `disabled` renders a submitting lock.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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
            :disabled="props.disabled"
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
          Semua batch aktif outlet dikunci dan di-snapshot menjadi item saat penghitungan dimulai.
        </p>
      </div>

      <!-- Opname Date -->
      <div>
        <label :class="labelClass">Tanggal Opname<span class="text-error-500">*</span></label>
        <input
          :value="props.opnameDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:opnameDate', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk opname ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
