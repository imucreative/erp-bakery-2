<script setup lang="ts">
/**
 * ERPCard — surface container with optional title/description header.
 */
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <section class="rounded-card border border-border bg-surface shadow-sm">
    <header
      v-if="title || $slots.header"
      class="flex items-center justify-between border-b border-border px-6 py-4"
    >
      <slot name="header">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">{{ title }}</h2>
          <p v-if="description" class="text-sm text-muted">{{ description }}</p>
        </div>
      </slot>
      <div v-if="$slots.actions" class="flex items-center gap-2">
        <slot name="actions" />
      </div>
    </header>
    <div class="p-6">
      <slot />
    </div>
  </section>
</template>
