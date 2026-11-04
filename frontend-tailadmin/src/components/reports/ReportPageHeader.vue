<template>
  <div class="flex items-center justify-between">
    <p class="text-muted">{{ description }}</p>
    <BaseButton variant="primary" :disabled="exporting" @click="emit('export')">
      {{ exporting ? 'Exporting...' : 'Export CSV' }}
    </BaseButton>
  </div>
</template>

<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'

defineProps<{
  description: string
  exporting?: boolean
}>()

const emit = defineEmits<{
  export: []
}>()
</script>
