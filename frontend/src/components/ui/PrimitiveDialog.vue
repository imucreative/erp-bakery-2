<script setup lang="ts">
/**
 * Primitive dialog (ui layer) built on Reka UI's Dialog primitives. Provides a
 * modal overlay + content panel with controlled `open` state and accessible
 * title/description wiring. The ERP UI Foundation (ERPDrawer) wraps this;
 * feature components must use the foundation component, never this directly.
 */
import {
  DialogRoot,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from 'reka-ui';

withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description?: string;
  }>(),
  { description: undefined },
);

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>();

function onOpenChange(value: boolean): void {
  emit('update:open', value);
}
</script>

<template>
  <DialogRoot :open="open" @update:open="onOpenChange">
    <DialogPortal>
      <DialogOverlay
        class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out"
      />
      <DialogContent
        class="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-xl focus:outline-none"
      >
        <header class="flex items-start justify-between border-b border-border px-6 py-4">
          <div class="space-y-1">
            <DialogTitle class="text-base font-semibold text-foreground">
              {{ title }}
            </DialogTitle>
            <DialogDescription v-if="description" class="text-sm text-muted">
              {{ description }}
            </DialogDescription>
          </div>
          <DialogClose
            class="rounded-button p-1 text-muted outline-none transition hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            aria-label="Close"
          >
            <slot name="close-icon" />
          </DialogClose>
        </header>
        <div class="flex-1 overflow-y-auto px-6 py-5">
          <slot />
        </div>
        <footer v-if="$slots.footer" class="border-t border-border px-6 py-4">
          <slot name="footer" />
        </footer>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
