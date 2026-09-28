<script setup lang="ts">
/**
 * NotFoundView — fallback for unmatched routes.
 */
import { useRouter } from 'vue-router';
import { ERPButton } from '@/components/erp';

const router = useRouter();
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
    <p class="text-5xl font-semibold text-primary">404</p>
    <h1 class="text-xl font-semibold text-foreground">Page not found</h1>
    <p class="max-w-sm text-sm text-muted">
      The page you are looking for does not exist or has been moved.
    </p>
    <ERPButton @click="router.push({ name: 'home' })">Back to dashboard</ERPButton>
  </div>
</template>
