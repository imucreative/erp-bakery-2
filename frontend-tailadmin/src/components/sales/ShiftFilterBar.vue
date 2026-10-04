<script setup lang="ts">
/**
 * ShiftFilterBar — status + outlet filter toolbar for the Shift list. Native
 * selects wrapped with a ChevronDownIcon per the UI standard. Two-way binds
 * `status` and `outlet` via v-model:status / v-model:outlet.
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { SHIFT_STATUSES, SHIFT_STATUS_LABELS } from '@/services/sales.service'
import type { ShiftStatusFilter } from '@/composables/useShifts'
import type { Outlet } from '@/services/outlet.service'

defineProps<{
  status: ShiftStatusFilter
  outlet: string
  outlets: Outlet[]
}>()

const emit = defineEmits<{
  (event: 'update:status', value: ShiftStatusFilter): void
  (event: 'update:outlet', value: string): void
}>()
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:w-48">
      <select
        :value="status"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:status', ($event.target as HTMLSelectElement).value as ShiftStatusFilter)"
      >
        <option value="all">Semua Status</option>
        <option v-for="s in SHIFT_STATUSES" :key="s" :value="s">
          {{ SHIFT_STATUS_LABELS[s] }}
        </option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
    <div class="relative w-full sm:w-56">
      <select
        :value="outlet"
        class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        @change="emit('update:outlet', ($event.target as HTMLSelectElement).value)"
      >
        <option value="">Semua Outlet</option>
        <option v-for="o in outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
      </select>
      <ChevronDownIcon
        class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
      />
    </div>
  </div>
</template>
