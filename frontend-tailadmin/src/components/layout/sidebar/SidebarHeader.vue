<template>
  <div :class="['sidebar-brand', showContent ? 'justify-start' : 'xl:justify-center']">
    <router-link to="/">
      <template v-if="showContent">
        <img class="dark:hidden" src="/images/logo/logo.svg" alt="Logo" width="150" height="40" />
        <img
          class="hidden dark:block"
          src="/images/logo/logo-dark.svg"
          alt="Logo"
          width="150"
          height="40"
        />
      </template>
      <img v-else src="/images/logo/logo-icon.svg" alt="Logo" width="32" height="32" />
    </router-link>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  showContent: boolean
}>()
</script>
