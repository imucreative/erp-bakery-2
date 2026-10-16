<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseTableHeadProps {
  align?: 'start' | 'center' | 'end'
}

const props = withDefaults(defineProps<BaseTableHeadProps>(), {
  align: 'start',
})

const attrs = useAttrs()
const alignClass = computed<string>(() => {
  const classes = {
    start: 'text-start',
    center: 'text-center',
    end: 'text-end',
  }
  return classes[props.align]
})
</script>

<template>
  <th
    v-bind="attrs"
    :class="[
      'px-5 py-3 text-theme-xs font-medium uppercase text-gray-500 dark:text-gray-400',
      alignClass,
    ]"
  >
    <slot />
  </th>
</template>
