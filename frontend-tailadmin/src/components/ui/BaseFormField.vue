<script setup lang="ts">
interface BaseFormFieldProps {
  label: string
  fieldId: string
  error?: string | null
  hint?: string
  required?: boolean
}

const props = withDefaults(defineProps<BaseFormFieldProps>(), {
  error: null,
  hint: '',
  required: false,
})
</script>

<template>
  <div>
    <label
      :for="props.fieldId"
      class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400"
    >
      {{ props.label }}<span v-if="props.required" class="text-error-500">*</span>
    </label>
    <slot />
    <p
      v-if="props.error"
      :id="`${props.fieldId}-error`"
      class="mt-1.5 text-sm text-error-600 dark:text-error-400"
    >
      {{ props.error }}
    </p>
    <p
      v-else-if="props.hint"
      :id="`${props.fieldId}-hint`"
      class="mt-1.5 text-sm text-gray-500 dark:text-gray-400"
    >
      {{ props.hint }}
    </p>
  </div>
</template>
