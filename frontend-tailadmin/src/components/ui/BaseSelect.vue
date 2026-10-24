<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

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
      class="form-input h-11 w-full appearance-none pe-10"
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
    <ChevronDown
      class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
    />
  </div>
</template>
