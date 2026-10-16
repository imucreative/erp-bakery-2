<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseTextareaProps {
  modelValue: string
  id: string
  rows?: number
  placeholder?: string
  error?: string | null
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<BaseTextareaProps>(), {
  rows: 3,
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
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <textarea
    v-bind="attrs"
    :id="props.id"
    :value="props.modelValue"
    :rows="props.rows"
    :placeholder="props.placeholder"
    :disabled="props.disabled"
    :readonly="props.readonly"
    :aria-invalid="props.error ? 'true' : undefined"
    :aria-describedby="describedBy"
    class="w-full resize-y rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 readonly:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:readonly:bg-white/[0.03]"
    @input="onInput"
  />
</template>
