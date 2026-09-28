<script setup lang="ts">
/**
 * ERPSelect — foundation single-select dropdown. Wraps PrimitiveSelect (ui
 * layer). Feature components use this instead of Reka UI's Select primitives or
 * a raw <select> (doc 19 §5). Value is a string; empty string means "no
 * selection".
 */
import PrimitiveSelect, {
  type PrimitiveSelectOption,
} from '@/components/ui/PrimitiveSelect.vue';

export type ERPSelectOption = PrimitiveSelectOption;

withDefaults(
  defineProps<{
    modelValue?: string;
    options: ERPSelectOption[];
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
  }>(),
  { modelValue: '', placeholder: 'Select...', disabled: false, invalid: false },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'blur'): void;
}>();
</script>

<template>
  <PrimitiveSelect
    :id="id"
    :model-value="modelValue"
    :options="options"
    :placeholder="placeholder"
    :disabled="disabled"
    :invalid="invalid"
    @update:model-value="emit('update:modelValue', $event)"
    @blur="emit('blur')"
  />
</template>
