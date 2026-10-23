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
    <label :for="props.fieldId" class="form-label">
      {{ props.label }}<span v-if="props.required" class="text-error-500">*</span>
    </label>
    <slot />
    <p v-if="props.error" :id="`${props.fieldId}-error`" class="form-error">
      {{ props.error }}
    </p>
    <p v-else-if="props.hint" :id="`${props.fieldId}-hint`" class="form-hint">
      {{ props.hint }}
    </p>
  </div>
</template>
