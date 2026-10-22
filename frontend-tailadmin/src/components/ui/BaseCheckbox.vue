<script setup lang="ts">
import { useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseCheckboxProps {
  modelValue: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseCheckboxProps>(), {
  disabled: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
}>()

const attrs = useAttrs()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <input
    v-bind="attrs"
    type="checkbox"
    :checked="props.modelValue"
    :disabled="props.disabled"
    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500/20 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800"
    @change="onChange"
  />
</template>
