<script setup lang="ts">
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'
import BaseButton from './BaseButton.vue'

interface BaseTablePaginationProps {
  currentCount: number
  totalItems: number
  currentPage: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
}

const props = defineProps<BaseTablePaginationProps>()

const emit = defineEmits<{
  (event: 'previous'): void
  (event: 'next'): void
}>()
</script>

<template>
  <div class="pagination-wrapper" aria-label="Pagination tabel">
    <span class="text-muted">
      Menampilkan {{ props.currentCount }} dari {{ props.totalItems }} data
    </span>
    <div class="pagination-buttons">
      <BaseButton
        size="sm"
        variant="outline"
        :disabled="!props.hasPrevious"
        @click="emit('previous')"
      >
        <template #start-icon><ChevronLeft class="h-4 w-4" aria-hidden="true" /></template>
        Sebelumnya
      </BaseButton>
      <span class="pagination-indicator">
        {{ props.currentPage }} / {{ props.totalPages }}
      </span>
      <BaseButton size="sm" variant="outline" :disabled="!props.hasNext" @click="emit('next')">
        <template #end-icon><ChevronRight class="h-4 w-4" aria-hidden="true" /></template>
        Berikutnya
      </BaseButton>
    </div>
  </div>
</template>
