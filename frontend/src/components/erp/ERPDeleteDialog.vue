<script setup lang="ts">
/**
 * ERPDeleteDialog — foundation confirmation modal for destructive actions.
 * Wraps PrimitiveModal (ui layer) and composes ERPButton for its actions.
 * Feature components use this instead of building their own confirm overlay
 * (doc 19 §5). Emits `confirm` when the user confirms; the caller owns the async
 * mutation and the `loading` flag.
 */
import { X } from 'lucide-vue-next';
import PrimitiveModal from '@/components/ui/PrimitiveModal.vue';
import ERPButton from './ERPButton.vue';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    loading?: boolean;
  }>(),
  {
    description: undefined,
    confirmLabel: 'Delete',
    cancelLabel: 'Cancel',
    loading: false,
  },
);

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void;
  (event: 'confirm'): void;
}>();

function onUpdateOpen(value: boolean): void {
  emit('update:open', value);
}

function onCancel(): void {
  emit('update:open', false);
}

function onConfirm(): void {
  emit('confirm');
}
</script>

<template>
  <PrimitiveModal
    :open="open"
    :title="title"
    :description="description"
    @update:open="onUpdateOpen"
  >
    <template #close-icon>
      <X class="h-4 w-4" aria-hidden="true" />
    </template>

    <slot />

    <template #footer>
      <div class="flex items-center justify-end gap-2">
        <ERPButton variant="secondary" :disabled="loading" @click="onCancel">
          {{ cancelLabel }}
        </ERPButton>
        <ERPButton variant="danger" :loading="loading" @click="onConfirm">
          {{ confirmLabel }}
        </ERPButton>
      </div>
    </template>
  </PrimitiveModal>
</template>
