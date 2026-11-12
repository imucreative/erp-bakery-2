<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from 'reka-ui'

interface ToggleSwitchProps {
  modelValue: boolean
  label?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<ToggleSwitchProps>(), {
  label: '',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <label
    :class="[
      'toggle-wrapper',
      props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    ]"
  >
    <SwitchRoot
      :model-value="props.modelValue"
      :disabled="props.disabled"
      :class="[
        'toggle-track',
        props.modelValue ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
        props.disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      ]"
      @update:model-value="emit('update:modelValue', $event)"
    >
      <SwitchThumb
        :class="[
          'toggle-thumb',
          props.modelValue
            ? 'ltr:translate-x-5 rtl:-translate-x-5'
            : 'ltr:translate-x-0.5 rtl:-translate-x-0.5',
        ]"
      />
    </SwitchRoot>
    <span v-if="props.label" class="text-sm text-gray-700 dark:text-gray-400">
      {{ props.label }}
    </span>
  </label>
</template>
