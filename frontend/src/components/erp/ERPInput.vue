<script setup lang="ts">
/**
 * ERPInput — foundation text input wrapping PrimitiveInput. Feature components
 * use this instead of a raw <input>.
 */
import PrimitiveInput from '@/components/ui/PrimitiveInput.vue';

withDefaults(
  defineProps<{
    modelValue?: string;
    id?: string;
    type?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    autocomplete?: string;
  }>(),
  { type: 'text', invalid: false, disabled: false },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'blur'): void;
}>();
</script>

<template>
  <PrimitiveInput
    :id="id"
    :model-value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :invalid="invalid"
    :autocomplete="autocomplete"
    @update:model-value="emit('update:modelValue', $event)"
    @blur="emit('blur')"
  />
</template>
