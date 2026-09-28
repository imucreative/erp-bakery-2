<script setup lang="ts">
/**
 * ERPEmpty — empty-state placeholder (doc 21 §3). Renders an icon slot, a
 * title, an optional description, and an optional action slot.
 */
import { Inbox } from 'lucide-vue-next';

withDefaults(
  defineProps<{
    title: string;
    description?: string;
  }>(),
  {},
);
</script>

<template>
  <div
    class="flex flex-col items-center justify-center rounded-card border border-dashed border-border bg-surface/60 px-6 py-14 text-center"
  >
    <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-background text-muted">
      <slot name="icon">
        <Inbox class="h-6 w-6" aria-hidden="true" />
      </slot>
    </div>
    <h3 class="text-base font-semibold text-foreground">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-md text-sm text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>
