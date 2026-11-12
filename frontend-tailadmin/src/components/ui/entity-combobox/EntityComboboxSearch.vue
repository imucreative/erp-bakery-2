<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { ComboboxInput } from 'reka-ui'

interface EntityComboboxSearchProps {
  modelValue: string
  placeholder: string
  ariaLabel?: string
  disabled?: boolean
}

withDefaults(defineProps<EntityComboboxSearchProps>(), {
  ariaLabel: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
}>()
</script>

<template>
  <div class="relative">
    <span
      class="pointer-events-none absolute inset-y-0 start-3 my-auto flex h-5 w-5 items-center text-gray-400 dark:text-gray-500"
    >
      <Search class="h-4 w-4" aria-hidden="true" />
    </span>
    <ComboboxInput
      :model-value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :aria-label="ariaLabel"
      class="form-input h-11 w-full ps-10"
      @update:model-value="emit('update:modelValue', $event)"
      @focus="emit('focus')"
    />
  </div>
</template>
