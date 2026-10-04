<script setup lang="ts">
/**
 * ShiftBar — POS header strip showing active-shift context (outlet, cashier,
 * opened-at) with a "Tutup Shift" button. Stateless: the parent owns the shift
 * and permission, and handles the close intent.
 */
import { Store, Clock, LogOut } from 'lucide-vue-next'
import { formatDateTime } from '@/lib/format'
import type { Shift } from '@/services/sales.service'

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
    class="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800 dark:bg-white/[0.03]"
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
    <button
      v-if="props.canManage"
      type="button"
      class="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-error-600 ring-1 ring-inset ring-error-200 transition hover:bg-error-50 dark:bg-transparent dark:ring-error-500/30 dark:hover:bg-error-500/10"
      @click="emit('close-shift')"
    >
      <LogOut class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
      Tutup Shift
    </button>
  </div>
</template>
