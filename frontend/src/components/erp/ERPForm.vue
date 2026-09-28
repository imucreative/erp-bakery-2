<script setup lang="ts">
/**
 * ERPForm — thin wrapper around a native <form> that delegates submission to a
 * VeeValidate-provided submit handler. Views build the form with
 * `useForm(... toTypedSchema(zodSchema))` and pass the wrapped handler here.
 */
defineProps<{
  onSubmit: (event?: Event) => unknown;
}>();
</script>

<template>
  <form class="space-y-6" novalidate @submit="onSubmit">
    <slot />
  </form>
</template>
