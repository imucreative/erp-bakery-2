<script setup lang="ts">
/**
 * ERPDrawer — foundation side panel used for read-only detail views and forms.
 * Wraps PrimitiveDialog (ui layer). Feature components compose this instead of
 * using Reka UI's Dialog primitives directly (doc 19 §3, §5).
 *
 * Supports `loading` (renders ERPLoading) so detail panels can show a spinner
 * while their query resolves without the feature component touching primitives.
 */
import { X } from 'lucide-vue-next';
import PrimitiveDialog from '@/components/ui/PrimitiveDialog.vue';
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
  <PrimitiveDialog
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
  </PrimitiveDialog>
</template>
