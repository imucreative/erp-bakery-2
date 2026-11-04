<template>
  <div
    class="flex flex-col justify-between gap-4 border-b border-gray-200 py-4 first:pt-0 last:border-b-0 last:pb-0 sm:flex-row sm:items-end dark:border-gray-800"
  >
    <div>
      <span class="text-strong mb-1 block">{{ title }}</span>
      <p class="text-muted">{{ description }}</p>
    </div>
    <div>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * One row inside a profile settings card: title + description on the left, the
 * action (button, badge, ...) on the right. Used by Security and Danger Zone.
 */
defineProps<{
  title: string
  description: string
}>()
</script>
