<script setup lang="ts">
import { ref } from 'vue'
import BaseButton from './BaseButton.vue'

const props = withDefaults(
  defineProps<{
    accept?: string
    disabled?: boolean
    size?: 'sm' | 'md'
    variant?: 'primary' | 'outline' | 'success' | 'info' | 'warning' | 'danger'
  }>(),
  {
    accept: undefined,
    disabled: false,
    size: 'md',
    variant: 'outline',
  },
)

const emit = defineEmits<{
  (event: 'file-change', file: File | null): void
}>()

const input = ref<HTMLInputElement | null>(null)

function openPicker(): void {
  input.value?.click()
}

function onChange(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  emit('file-change', target.files?.[0] ?? null)
}

function reset(): void {
  if (input.value) {
    input.value.value = ''
  }
}

defineExpose({ reset })
</script>

<template>
  <BaseButton
    type="button"
    :size="props.size"
    :variant="props.variant"
    :disabled="props.disabled"
    @click="openPicker"
  >
    <slot />
  </BaseButton>
  <input
    ref="input"
    type="file"
    class="sr-only"
    :accept="props.accept"
    :disabled="props.disabled"
    @change="onChange"
  />
</template>
