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
    normal: 'td-normal',
    medium: 'td-medium',
    mono: 'td-mono',
  }
  return `${alignClasses[props.align]} ${emphasisClasses[props.emphasis]}`
})
</script>

<template>
  <td
    v-bind="attrs"
    :class="['td-base', cellClass, typeof attrs.class === 'string' ? attrs.class : '']"
  >
    <slot />
  </td>
</template>
