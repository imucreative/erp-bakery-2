<script setup lang="ts">
/**
 * ERPFormDialog — foundation modal for create/edit forms. Wraps PrimitiveModal
 * (ui layer) and exposes `default` (form body) and `footer` (actions) slots.
 * Feature components compose this instead of using Reka UI's Dialog primitives
 * directly (doc 19 §3, §5).
 *
 * Supports `loading` (renders ERPLoading) so a form can show a spinner while its
 * backing detail query resolves without the feature component touching
 * primitives.
 */
import { X } from 'lucide-vue-next';
import PrimitiveModal from '@/components/ui/PrimitiveModal.vue';
import ERPLoading from './ERPLoading.vue';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
    loading?: boolean;
    loadingLabel?: string;
  }>(),
  { description: undefined, loading: false, loadingLabel: 'Loading...' },
);

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

function onUpdateOpen(value: boolean): void {
  emit('update:open', value);
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

    <ERPLoading v-if="loading" :label="loadingLabel" />
    <slot v-else />

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </PrimitiveModal>
</template>
