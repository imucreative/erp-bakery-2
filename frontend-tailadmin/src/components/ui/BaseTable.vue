<script setup lang="ts">
import BaseAlert from './BaseAlert.vue'

interface BaseTableProps {
  loading?: boolean
  errorMessage?: string | null
  isEmpty?: boolean
  emptyMessage?: string
  ariaLabel?: string
}

withDefaults(defineProps<BaseTableProps>(), {
  loading: false,
  errorMessage: null,
  isEmpty: false,
  emptyMessage: 'Tidak ada data.',
  ariaLabel: 'Data tabel',
})
</script>

<template>
  <div>
    <div v-if="loading" class="text-muted py-10 text-center">
      <slot name="loading">Memuat data...</slot>
    </div>

    <BaseAlert v-else-if="errorMessage">
      <slot name="error">{{ errorMessage }}</slot>
    </BaseAlert>

    <div v-else-if="isEmpty" class="text-muted py-10 text-center">
      <slot name="empty">{{ emptyMessage }}</slot>
    </div>

    <div v-else class="overflow-x-auto">
      <table class="min-w-full" :aria-label="ariaLabel">
        <thead>
          <slot name="header" />
        </thead>
        <tbody>
          <slot name="body" />
        </tbody>
        <tfoot>
          <slot name="footer" />
        </tfoot>
      </table>
    </div>
  </div>
</template>
