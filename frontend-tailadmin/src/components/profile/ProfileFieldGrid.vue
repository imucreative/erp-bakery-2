<template>
  <div class="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
    <div v-for="field in fields" :key="field.label">
      <p class="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
        {{ field.label }}
      </p>
      <p class="text-sm font-medium text-gray-800 dark:text-white/90">{{ field.value }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
/** Read-only label/value grid used by the profile cards. */
defineProps<{
  fields: Array<{ label: string; value: string }>
}>()
</script>
