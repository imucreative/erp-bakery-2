<script setup lang="ts">
/**
 * ShiftFilterBar — status + outlet filter toolbar for the Shift list. Native
 * selects wrapped with a ChevronDownIcon per the UI standard. Two-way binds
 * `status` and `outlet` via v-model:status / v-model:outlet.
 */
import { BaseSelect } from '@/components/ui'
import { SHIFT_STATUS_LABELS } from '@/services/sales.service'
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
  <div class="stack-row">
    <BaseSelect
      id="shift-status-filter"
      class="w-full sm:w-48"
      :model-value="status"
      :options="[
        { label: 'Semua Status', value: 'all' },
        ...Object.entries(SHIFT_STATUS_LABELS).map(([value, label]) => ({ label, value })),
      ]"
      @update:model-value="emit('update:status', $event as ShiftStatusFilter)"
    />
    <BaseSelect
      id="shift-outlet-filter"
      class="w-full sm:w-56"
      :model-value="outlet"
      :options="outlets.map((outlet) => ({ label: outlet.name, value: outlet.id }))"
      placeholder="Semua Outlet"
      @update:model-value="emit('update:outlet', $event)"
    />
  </div>
</template>
