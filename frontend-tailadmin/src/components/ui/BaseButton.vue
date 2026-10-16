<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseButtonProps {
  type?: 'button' | 'submit' | 'reset'
  size?: 'sm' | 'md'
  variant?: 'primary' | 'outline' | 'success' | 'info' | 'warning' | 'danger'
  disabled?: boolean
  loading?: boolean
  fullWidth?: boolean
  iconOnly?: boolean
  loadingText?: string
}

const props = withDefaults(defineProps<BaseButtonProps>(), {
  type: 'button',
  size: 'md',
  variant: 'primary',
  disabled: false,
  loading: false,
  fullWidth: false,
  iconOnly: false,
  loadingText: 'Memproses...',
})

const emit = defineEmits<{
  (event: 'click', value: MouseEvent): void
}>()

const attrs = useAttrs()
const sizeClasses = {
  sm: 'px-4 py-3 text-sm',
  md: 'px-5 py-3.5 text-sm',
}
const variantClasses = {
  primary: 'bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300',
  outline:
    'bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300',
  success: 'bg-success-500 text-white shadow-theme-xs hover:bg-success-600 disabled:bg-success-300',
  info: 'bg-blue-light-500 text-white shadow-theme-xs hover:bg-blue-light-600 disabled:bg-blue-light-300',
  warning: 'bg-warning-500 text-white shadow-theme-xs hover:bg-warning-600 disabled:bg-warning-300',
  danger: 'bg-error-500 text-white shadow-theme-xs hover:bg-error-600 disabled:bg-error-300',
}

const buttonClass = computed<string>(() =>
  [
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition',
    props.iconOnly ? 'h-9 w-9 p-0' : sizeClasses[props.size],
    variantClasses[props.variant],
    props.fullWidth ? 'w-full' : '',
    props.loading || props.disabled ? 'cursor-not-allowed opacity-60' : '',
    typeof attrs.class === 'string' ? attrs.class : '',
  ]
    .filter(Boolean)
    .join(' '),
)

function onClick(event: MouseEvent): void {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>

<template>
  <button
    v-bind="attrs"
    :type="props.type"
    :disabled="props.disabled || props.loading"
    :class="buttonClass"
    @click="onClick"
  >
    <span
      v-if="loading"
      class="h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent"
      aria-hidden="true"
    />
    <slot v-else name="start-icon" />
    <slot v-if="!loading" />
    <span v-if="loading" aria-live="polite">{{ loadingText }}</span>
    <slot v-if="!loading" name="end-icon" />
  </button>
</template>
