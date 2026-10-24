<template>
  <label
    :class="[
      'toggle-wrapper',
      disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
    ]"
  >
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :disabled="disabled"
      @click="toggle"
      :class="[
        'toggle-track',
        modelValue ? 'bg-brand-500' : 'bg-gray-200 dark:bg-gray-700',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      ]"
    >
      <span
        :class="[
          'toggle-thumb',
          modelValue
            ? 'ltr:translate-x-5 rtl:-translate-x-5'
            : 'ltr:translate-x-0.5 rtl:-translate-x-0.5',
        ]"
      />
    </button>
    <span v-if="label" class="text-sm text-gray-700 dark:text-gray-400">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
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

const toggle = () => {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
}
</script>
