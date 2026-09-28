<script setup lang="ts">
/**
 * ERPPasswordInput — password field with a show/hide toggle. Wraps
 * PrimitiveInput and keeps the toggle button inside the foundation layer.
 */
import { ref } from 'vue';
import { Eye, EyeOff } from 'lucide-vue-next';
import PrimitiveInput from '@/components/ui/PrimitiveInput.vue';

withDefaults(
  defineProps<{
    modelValue?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    invalid?: boolean;
    autocomplete?: string;
  }>(),
  { invalid: false, disabled: false, autocomplete: 'current-password' },
);

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'blur'): void;
}>();

const revealed = ref<boolean>(false);
</script>

<template>
  <div class="relative">
    <PrimitiveInput
      :id="id"
      :model-value="modelValue"
      :type="revealed ? 'text' : 'password'"
      :placeholder="placeholder"
      :disabled="disabled"
      :invalid="invalid"
      :autocomplete="autocomplete"
      @update:model-value="emit('update:modelValue', $event)"
      @blur="emit('blur')"
    />
    <button
      type="button"
      class="absolute inset-y-0 right-0 flex items-center px-3 text-muted transition hover:text-foreground"
      :aria-label="revealed ? 'Hide password' : 'Show password'"
      tabindex="-1"
      @click="revealed = !revealed"
    >
      <EyeOff v-if="revealed" class="h-4 w-4" aria-hidden="true" />
      <Eye v-else class="h-4 w-4" aria-hidden="true" />
    </button>
  </div>
</template>
