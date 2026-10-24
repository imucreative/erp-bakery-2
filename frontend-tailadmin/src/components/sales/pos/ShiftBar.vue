<script setup lang="ts">
/**
 * ShiftBar — POS header strip showing active-shift context (outlet, cashier,
 * opened-at) with a "Tutup Shift" button. Stateless: the parent owns the shift
 * and permission, and handles the close intent.
 */
import { Store, Clock, LogOut } from 'lucide-vue-next'
import { formatDateTime } from '@/lib/format'
import type { Shift } from '@/services/sales.service'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  shift: Shift
  outletName: string
  cashierName: string
  canManage: boolean
}>()

const emit = defineEmits<{
  (e: 'close-shift'): void
}>()
</script>

<template>
  <div
    class="toolbar-row rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-theme-sm">
      <span class="flex items-center gap-2 text-gray-700 dark:text-gray-300">
        <Store class="h-4 w-4 text-gray-400" aria-hidden="true" />
        {{ props.outletName }}
      </span>
      <span class="text-gray-600 dark:text-gray-400">Kasir: {{ props.cashierName }}</span>
      <span class="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Clock class="h-4 w-4 text-gray-400" aria-hidden="true" />
        {{ formatDateTime(props.shift.openedAt) }}
      </span>
    </div>
    <BaseButton v-if="props.canManage" size="sm" variant="danger" @click="emit('close-shift')">
      <template #start-icon>
        <LogOut class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      </template>
      Tutup Shift
    </BaseButton>
  </div>
</template>
