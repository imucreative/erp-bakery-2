<script setup lang="ts">
/**
 * ERPPageHeader — title, optional description, and an actions slot.
 */
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="space-y-1">
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">{{ title }}</h1>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
