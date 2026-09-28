<script setup lang="ts">
/**
 * ERPFormField — binds a single field to VeeValidate via `useField`, renders the
 * label and validation error, and exposes value/handlers to the default slot so
 * an ERP input can be wired without touching primitives directly.
 *
 * Usage:
 *   <ERPFormField name="email" label="Email" v-slot="{ value, setValue, onBlur, invalid, id }">
 *     <ERPInput :id="id" :model-value="value" :invalid="invalid"
 *               @update:model-value="setValue" @blur="onBlur" />
 *   </ERPFormField>
 */
import { computed, useId } from 'vue';
import { useField } from 'vee-validate';

const props = defineProps<{
  name: string;
  label?: string;
}>();

const fieldId = useId();

const { value, errorMessage, handleBlur, setValue, meta } = useField<string>(
  () => props.name,
);

const invalid = computed<boolean>(() => Boolean(errorMessage.value) && meta.touched);
</script>

<template>
  <div class="space-y-1.5">
    <label
      v-if="label"
      :for="fieldId"
      class="block text-sm font-medium text-foreground"
    >
      {{ label }}
    </label>
    <slot
      :id="fieldId"
      :value="value"
      :setValue="setValue"
      :onBlur="handleBlur"
      :invalid="invalid"
    />
    <p v-if="invalid" class="text-sm text-danger">{{ errorMessage }}</p>
  </div>
</template>
