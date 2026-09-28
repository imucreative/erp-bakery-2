<script setup lang="ts">
/**
 * ERPLoading — centered spinner with an optional label.
 */
import { Loader2 } from 'lucide-vue-next';

withDefaults(defineProps<{ label?: string }>(), { label: 'Loading...' });
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-12 text-muted">
    <Loader2 class="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
    <p class="text-sm">{{ label }}</p>
  </div>
</template>
