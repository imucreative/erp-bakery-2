<script setup lang="ts">
/**
 * UomDeleteModal — delete confirmation for a UOM. Emits `confirm`; parent runs
 * the mutation and controls `deleting` + `errorMessage`. Transparent backdrop.
 */
import Button from '@/components/ui/Button.vue'
import { Trash2 } from 'lucide-vue-next'
import type { Uom } from '@/services/uom.service'

withDefaults(
  defineProps<{
    open: boolean
    uom?: Uom | null
    deleting?: boolean
    errorMessage?: string | null
  }>(),
  { uom: null, deleting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Hapus UOM</h4>
      <p class="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Yakin menghapus "{{ uom?.name }}"? Tindakan ini tidak dapat dibatalkan.
      </p>

      <p
        v-if="errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <Button size="sm" variant="outline" :disabled="deleting" :on-click="() => emit('close')">
          Batal
        </Button>
        <button
          type="button"
          :disabled="deleting"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
          @click="emit('confirm')"
        >
          <Trash2 class="h-4 w-4" aria-hidden="true" />
          {{ deleting ? 'Menghapus...' : 'Hapus' }}
        </button>
      </div>
    </div>
  </div>
</template>
