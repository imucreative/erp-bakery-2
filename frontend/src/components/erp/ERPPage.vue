<script setup lang="ts">
/**
 * ERPPage — top-level page shell. Provides consistent max width and vertical
 * rhythm. Views compose header + content inside this.
 */
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <slot />
  </div>
</template>
