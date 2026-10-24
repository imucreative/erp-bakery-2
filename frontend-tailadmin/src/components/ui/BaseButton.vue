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
  sm: 'btn-sm',
  md: 'btn-md',
}
const variantClasses = {
  primary: 'btn-primary',
  outline: 'btn-outline',
  success: 'btn-success',
  info: 'btn-info',
  warning: 'btn-warning',
  danger: 'btn-danger',
}

const buttonClass = computed<string>(() =>
  [
    'btn-base',
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
