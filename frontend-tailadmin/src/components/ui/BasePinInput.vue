<script setup lang="ts">
/**
 * BasePinInput — numeric one-time-code input (Reka UI PinInput).
 *
 * Used by the two-step verification screen. The public value stays a plain
 * string (`v-model`), while Reka works with an array of digit slots. Only
 * digits are accepted; recovery codes keep using BaseInput.
 */
import { computed, useAttrs } from 'vue'
import { PinInputInput, PinInputRoot } from 'reka-ui'

defineOptions({ inheritAttrs: false })

interface BasePinInputProps {
  modelValue: string
  id: string
  length?: number
  disabled?: boolean
  error?: string | null
}

const props = withDefaults(defineProps<BasePinInputProps>(), {
  length: 6,
  disabled: false,
  error: null,
})

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void
  (event: 'complete', value: string): void
}>()

const attrs = useAttrs()

const describedBy = computed<string | undefined>(() => {
  if (props.error) return `${props.id}-error`
  const hintId = attrs['aria-describedby']
  return typeof hintId === 'string' ? hintId : undefined
})

/** String model → Reka's numeric slot array. */
const pinValue = computed<(number | undefined)[]>(() =>
  Array.from({ length: props.length }, (_, index) => {
    const char = props.modelValue[index]
    return char && /\d/.test(char) ? Number(char) : undefined
  }),
)

function toCode(value: (number | undefined)[]): string {
  return Array.from({ length: props.length }, (_, index) => {
    const digit = value[index]
    return digit === undefined || digit === null ? '' : String(digit)
  }).join('')
}

function onUpdate(value: (number | undefined)[]): void {
  emit('update:modelValue', toCode(value))
}

function onComplete(value: (number | undefined)[]): void {
  emit('complete', toCode(value))
}
</script>

<template>
  <PinInputRoot
    v-bind="attrs"
    :id="props.id"
    :model-value="pinValue"
    type="number"
    otp
    :disabled="props.disabled"
    :aria-invalid="props.error ? 'true' : undefined"
    class="grid w-full gap-2"
    :style="{ gridTemplateColumns: `repeat(${props.length}, minmax(0, 1fr))` }"
    @update:model-value="onUpdate"
    @complete="onComplete"
  >
    <PinInputInput
      v-for="index in props.length"
      :key="index"
      :index="index - 1"
      :disabled="props.disabled"
      :aria-invalid="props.error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="h-12 w-full min-w-0 rounded-lg border border-gray-300 bg-transparent text-center text-theme-sm font-medium text-gray-800 shadow-theme-xs outline-none transition-colors focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 aria-invalid:border-error-500 aria-invalid:focus:border-error-500 aria-invalid:focus:ring-error-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
    />
  </PinInputRoot>
</template>
