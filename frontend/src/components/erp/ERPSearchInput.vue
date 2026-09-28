<script setup lang="ts">
/**
 * ERPSearchInput — foundation search field: a search icon + text input built on
 * PrimitiveInput, with a clear button when a value is present. Feature filter
 * bars use this instead of a raw <input> (doc 19 §5). Emits `update:modelValue`
 * on each keystroke; debouncing is the caller's concern.
 */
import { Search, X } from 'lucide-vue-next';
import PrimitiveInput from '@/components/ui/PrimitiveInput.vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
  }>(),
  { modelValue: '', placeholder: 'Search...', disabled: false },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

function onClear(): void {
  emit('update:modelValue', '');
}
</script>

<template>
  <div class="relative">
    <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted">
      <Search class="h-4 w-4" aria-hidden="true" />
    </span>
    <PrimitiveInput
      :id="id"
      :model-value="modelValue"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      class="pl-9"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <button
      v-if="props.modelValue"
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition hover:text-foreground"
      aria-label="Clear search"
      tabindex="-1"
      @click="onClear"
    >
      <X class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
