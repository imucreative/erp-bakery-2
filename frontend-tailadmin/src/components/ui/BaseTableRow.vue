<script setup lang="ts">
interface BaseTableRowProps {
  variant?: 'header' | 'body'
}

withDefaults(defineProps<BaseTableRowProps>(), {
  variant: 'body',
})
</script>

<template>
  <tr class="tr-base">
    <slot />
  </tr>
</template>
