<script setup lang="ts">
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'

interface BaseToggleProps {
  modelValue: boolean
  label?: string
  disabled?: boolean
}

withDefaults(defineProps<BaseToggleProps>(), {
  label: '',
  disabled: false,
})

defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()
</script>

<template>
  <ToggleSwitch
    :model-value="modelValue"
    :label="label"
    :disabled="disabled"
    @update:model-value="$emit('update:modelValue', $event)"
  />
</template>
