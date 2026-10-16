<script setup lang="ts">
interface BaseTableRowProps {
  variant?: 'header' | 'body'
}

withDefaults(defineProps<BaseTableRowProps>(), {
  variant: 'body',
})
</script>

<template>
  <tr
    :class="
      variant === 'header'
        ? 'border-b border-gray-100 dark:border-gray-800'
        : 'border-b border-gray-100 dark:border-gray-800'
    "
  >
    <slot />
  </tr>
</template>
