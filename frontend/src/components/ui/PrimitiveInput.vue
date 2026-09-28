<script setup lang="ts">
/**
 * Primitive text input (ui layer). This is the single place a raw <input> is
 * allowed. Feature components must never use <input> directly — they consume
 * ERPInput / ERPPasswordInput from the ERP UI Foundation layer, which wrap this.
 */
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    type?: string;
    id?: string;
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

const value = computed<string>({
  get: () => props.modelValue ?? '',
  set: (next) => emit('update:modelValue', next),
});
</script>

<template>
  <input
    :id="id"
    v-model="value"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :aria-invalid="invalid || undefined"
    class="w-full rounded-input border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
    :class="invalid ? 'border-danger focus:border-danger focus:ring-danger/40' : 'border-border'"
    @blur="emit('blur')"
  />
</template>
