<script setup lang="ts">
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
    <div v-if="loading" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
      <slot name="loading">Memuat data...</slot>
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-lg border border-error-500/40 bg-error-50 px-4 py-3 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      role="alert"
    >
      <slot name="error">{{ errorMessage }}</slot>
    </div>

    <div v-else-if="isEmpty" class="py-10 text-center text-sm text-gray-500 dark:text-gray-400">
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
