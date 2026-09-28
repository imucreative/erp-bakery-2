<script setup lang="ts">
/**
 * ERPMultiSelect — foundation multi-select rendered as a scrollable list of
 * toggleable option rows. Used for assigning a set of ids (e.g. a user's
 * outlets). The model is a `string[]` of selected values; toggling a row emits
 * the next array. Rows are `ERPButton`-free toggle buttons kept inside the
 * foundation layer so feature components never touch raw controls (doc 19 §5).
 *
 * Renders its own empty state when there are no options and a small selection
 * summary so the count is always visible.
 */
import { computed } from 'vue';
import { Check } from 'lucide-vue-next';

export interface ERPMultiSelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string[];
    options: ERPMultiSelectOption[];
    disabled?: boolean;
    emptyLabel?: string;
  }>(),
  { modelValue: () => [], disabled: false, emptyLabel: 'No options available.' },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string[]): void;
}>();

const selected = computed<Set<string>>(() => new Set(props.modelValue));

const selectedCount = computed<number>(() => props.modelValue.length);

function isSelected(value: string): boolean {
  return selected.value.has(value);
}

function toggle(value: string, optionDisabled?: boolean): void {
  if (props.disabled || optionDisabled) {
    return;
  }
  const next = new Set(props.modelValue);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  emit('update:modelValue', Array.from(next));
}
</script>

<template>
  <div class="space-y-2">
    <p
      v-if="options.length === 0"
      class="rounded-input border border-dashed border-border bg-background px-3.5 py-2.5 text-sm text-muted"
    >
      {{ emptyLabel }}
    </p>

    <div
      v-else
      class="max-h-48 space-y-1 overflow-y-auto rounded-input border border-border bg-surface p-1"
    >
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :disabled="disabled || option.disabled"
        class="flex w-full items-center gap-3 rounded-button px-3 py-2 text-left text-sm text-foreground outline-none transition hover:bg-background focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
        :aria-pressed="isSelected(option.value)"
        @click="toggle(option.value, option.disabled)"
      >
        <span
          class="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition"
          :class="
            isSelected(option.value)
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-surface text-transparent'
          "
        >
          <Check class="h-3 w-3" aria-hidden="true" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="block truncate font-medium">{{ option.label }}</span>
          <span v-if="option.hint" class="block truncate text-xs text-muted">
            {{ option.hint }}
          </span>
        </span>
      </button>
    </div>

    <p class="text-xs text-muted">
      {{ selectedCount }} selected
    </p>
  </div>
</template>
