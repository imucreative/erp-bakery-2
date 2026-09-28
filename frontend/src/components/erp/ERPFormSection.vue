<script setup lang="ts">
/**
 * ERPFormSection — groups related form fields with an optional heading.
 */
defineProps<{
  title?: string;
  description?: string;
}>();
</script>

<template>
  <fieldset class="space-y-4">
    <legend v-if="title" class="space-y-1">
      <span class="text-sm font-semibold text-foreground">{{ title }}</span>
      <span v-if="description" class="block text-sm text-muted">{{ description }}</span>
    </legend>
    <div class="space-y-4">
      <slot />
    </div>
  </fieldset>
</template>
