<script setup lang="ts">
/**
 * Primitive select (ui layer) built on Reka UI's Select primitives. This is the
 * single place Reka UI's Select is allowed. The ERP UI Foundation (ERPSelect)
 * wraps this; feature components must use the foundation component, never this
 * directly (doc 19 §3, §5).
 *
 * Value is a string (empty string means "no selection"). Options carry a
 * `label`/`value` pair; the trigger shows the selected option's label or the
 * placeholder.
 */
import { computed } from 'vue';
import {
  SelectRoot,
  SelectTrigger,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectValue,
} from 'reka-ui';
import { Check, ChevronsUpDown } from 'lucide-vue-next';

export interface PrimitiveSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    options: PrimitiveSelectOption[];
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

/**
 * Reka UI 2.0 rejects a `SelectItem` whose `value` is an empty string. Filter
 * dropdowns model "no selection" / "all" as an empty-string option, so we map
 * empty-string option values to a non-empty internal sentinel for Reka UI and
 * translate it back on emit. The public contract is unchanged: `modelValue` and
 * the emitted value still use `''` to mean "no selection".
 */
const EMPTY_SENTINEL = '__erp_empty__';

const internalOptions = computed<PrimitiveSelectOption[]>(() =>
  props.options.map((option) =>
    option.value === '' ? { ...option, value: EMPTY_SENTINEL } : option,
  ),
);

// Reka UI's SelectRoot treats an empty string oddly for controlled state; use a
// nullable bridge so "no selection" maps cleanly to the placeholder.
const model = computed<string | null>({
  get: () => (props.modelValue ? props.modelValue : null),
  set: (next) =>
    emit('update:modelValue', next === null || next === EMPTY_SENTINEL ? '' : next),
});

const triggerClasses = computed<string>(() =>
  [
    'flex w-full items-center justify-between gap-2 rounded-input border bg-surface px-3.5 py-2.5 text-sm text-foreground shadow-sm outline-none transition',
    'focus:border-primary focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60',
    'data-[placeholder]:text-muted',
    props.invalid
      ? 'border-danger focus:border-danger focus:ring-danger/40'
      : 'border-border',
  ].join(' '),
);
</script>

<template>
  <SelectRoot v-model="model" :disabled="disabled">
    <SelectTrigger
      :id="id"
      :class="triggerClasses"
      :aria-invalid="invalid || undefined"
      @blur="emit('blur')"
    >
      <SelectValue :placeholder="placeholder" />
      <ChevronsUpDown class="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
    </SelectTrigger>

    <SelectPortal>
      <SelectContent
        position="popper"
        :side-offset="4"
        class="z-50 max-h-60 min-w-[var(--reka-select-trigger-width)] overflow-hidden rounded-card border border-border bg-surface shadow-lg"
      >
        <SelectViewport class="p-1">
          <SelectItem
            v-for="option in internalOptions"
            :key="option.value"
            :value="option.value"
            :disabled="option.disabled"
            class="relative flex cursor-pointer select-none items-center rounded-button py-2 pl-8 pr-3 text-sm text-foreground outline-none transition data-[highlighted]:bg-background data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50"
          >
            <SelectItemIndicator class="absolute left-2 inline-flex items-center">
              <Check class="h-4 w-4 text-primary" aria-hidden="true" />
            </SelectItemIndicator>
            <SelectItemText>{{ option.label }}</SelectItemText>
          </SelectItem>
        </SelectViewport>
      </SelectContent>
    </SelectPortal>
  </SelectRoot>
</template>
