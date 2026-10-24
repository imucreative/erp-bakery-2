<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseInputProps {
  modelValue: string | number
  id: string
  type?: 'text' | 'email' | 'password' | 'number' | 'date' | 'search' | 'tel' | 'url'
  placeholder?: string
  error?: string | null
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<BaseInputProps>(), {
  type: 'text',
  placeholder: '',
  error: null,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
}>()

const attrs = useAttrs()
const describedBy = computed<string | undefined>(() => {
  if (props.error) return `${props.id}-error`
  const hintId = attrs['aria-describedby']
  return typeof hintId === 'string' ? hintId : undefined
})

function onInput(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>

<template>
  <input
    v-bind="attrs"
    :id="props.id"
    :value="props.modelValue"
    :type="props.type"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :aria-invalid="props.error ? 'true' : undefined"
    :aria-describedby="describedBy"
    class="form-input h-11 w-full readonly:bg-gray-50 dark:readonly:bg-white/[0.03]"
    @input="onInput"
  />
</template>
