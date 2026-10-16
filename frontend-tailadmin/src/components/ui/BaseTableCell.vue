<script setup lang="ts">
import { computed, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

interface BaseTableCellProps {
  align?: 'start' | 'center' | 'end'
  emphasis?: 'normal' | 'medium' | 'mono'
}

const props = withDefaults(defineProps<BaseTableCellProps>(), {
  align: 'start',
  emphasis: 'normal',
})

const attrs = useAttrs()
const cellClass = computed<string>(() => {
  const alignClasses = {
    start: 'text-start',
    center: 'text-center',
    end: 'text-end',
  }
  const emphasisClasses = {
    normal: 'text-gray-600 dark:text-gray-300',
    medium: 'font-medium text-gray-800 dark:text-white/90',
    mono: 'font-mono text-gray-600 dark:text-gray-300',
  }
  return `${alignClasses[props.align]} ${emphasisClasses[props.emphasis]}`
})
</script>

<template>
  <td
    v-bind="attrs"
    :class="[
      'px-5 py-4 text-theme-sm',
      cellClass,
      typeof attrs.class === 'string' ? attrs.class : '',
    ]"
  >
    <slot />
  </td>
</template>
