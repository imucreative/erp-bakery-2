<template>
  <div
    :class="[
      'rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]',
      clickable && 'cursor-pointer transition hover:shadow-md',
    ]"
    @click="clickable && $emit('click')"
  >
    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-gray-500 dark:text-gray-400">{{ title }}</p>
      <div v-if="icon" class="text-gray-400 dark:text-gray-500">
        <component :is="icon" class="size-5" />
      </div>
    </div>

    <div class="flex items-end justify-between">
      <div>
        <p class="text-2xl font-semibold text-gray-800 dark:text-white/90">
          {{ formattedValue }}
        </p>
        <p v-if="subtitle" class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {{ subtitle }}
        </p>
      </div>

      <div v-if="trend" :class="['text-xs font-medium', trendColor]">
        {{ trend }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  title: string
  value: number | string
  subtitle?: string
  trend?: string
  trendColor?: 'green' | 'red' | 'amber' | 'gray'
  icon?: any
  clickable?: boolean
  format?: 'currency' | 'number' | 'percent' | 'raw'
}

const props = withDefaults(defineProps<Props>(), {
  trendColor: 'gray',
  clickable: false,
  format: 'raw',
})

defineEmits<{
  (event: 'click'): void
}>()

const formattedValue = computed(() => {
  if (props.format === 'raw') return props.value

  const numValue = typeof props.value === 'string' ? parseFloat(props.value) : props.value

  if (props.format === 'currency') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue)
  }

  if (props.format === 'number') {
    return new Intl.NumberFormat('id-ID').format(numValue)
  }

  if (props.format === 'percent') {
    return `${numValue.toFixed(1)}%`
  }

  return props.value
})

const trendColor = computed(() => {
  const colors = {
    green: 'text-green-600 dark:text-green-500',
    red: 'text-red-600 dark:text-red-500',
    amber: 'text-amber-600 dark:text-amber-500',
    gray: 'text-gray-600 dark:text-gray-400',
  }
  return colors[props.trendColor]
})
</script>
