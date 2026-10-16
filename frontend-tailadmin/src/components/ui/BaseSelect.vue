<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'

defineOptions({ inheritAttrs: false })

interface SelectOption {
  label: string
  value: string
  disabled?: boolean
}

interface BaseSelectProps {
  modelValue: string
  id: string
  options: SelectOption[]
  placeholder?: string
  error?: string | null
  disabled?: boolean
}

const props = withDefaults(defineProps<BaseSelectProps>(), {
  placeholder: '',
  error: null,
  disabled: false,
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

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="relative">
    <select
      v-bind="attrs"
      :id="props.id"
      :value="props.modelValue"
      :disabled="props.disabled"
      :aria-invalid="props.error ? 'true' : undefined"
      :aria-describedby="describedBy"
      class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      @change="onChange"
    >
      <option v-if="props.placeholder" value="" disabled>{{ props.placeholder }}</option>
      <option
        v-for="option in props.options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
    <ChevronDownIcon
      class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
    />
  </div>
</template>
