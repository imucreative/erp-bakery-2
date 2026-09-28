<script setup lang="ts">
/**
 * Root component. Renders the routed view and mounts the global toast host.
 */
import { RouterView } from 'vue-router';
import { ERPNotification } from '@/components/erp';
</script>

<template>
  <RouterView />
  <ERPNotification />
</template>
