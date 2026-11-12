<script setup lang="ts">
import { X } from 'lucide-vue-next'

interface EntityComboboxChipProps {
  label: string
  clearAriaLabel: string
  disabled?: boolean
}

withDefaults(defineProps<EntityComboboxChipProps>(), {
  disabled: false,
})

const emit = defineEmits<{
  clear: []
}>()
</script>

<template>
  <div
    class="flex h-11 items-center justify-between gap-2 rounded-lg border border-gray-300 bg-gray-50 px-4 text-sm text-gray-800 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90"
  >
    <span class="truncate">{{ label }}</span>
    <button
      type="button"
      :aria-label="clearAriaLabel"
      :title="clearAriaLabel"
      :disabled="disabled"
      class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-500 transition hover:bg-gray-200 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-200"
      @click="emit('clear')"
    >
      <X class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
