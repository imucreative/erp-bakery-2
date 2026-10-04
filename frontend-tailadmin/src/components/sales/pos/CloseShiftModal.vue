<script setup lang="ts">
/**
 * CloseShiftModal — close the active cashier shift: actual cash count + optional
 * notes. On a successful close the parent passes back the updated shift so this
 * modal can display the expected cash and discrepancy result before dismissing.
 * Stateless w.r.t. the mutation: the parent owns submitting + errors.
 * Transparent backdrop per UI standard.
 */
import { ref, watch } from 'vue'
import { LogOut, CheckCircle2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import { formatRupiah } from '@/lib/format'
import type { Shift } from '@/services/sales.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    submitting?: boolean
    errorMessage?: string | null
    /** When set, the shift was closed; show the reconciliation result. */
    result?: Shift | null
  }>(),
  { submitting: false, errorMessage: null, result: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payload: { actualCash: number; notes: string }): void
}>()

const actualCash = ref<number>(0)
const notes = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      actualCash.value = 0
      notes.value = ''
    }
  },
)

function onConfirm(): void {
  emit('confirm', {
    actualCash: actualCash.value >= 0 ? actualCash.value : 0,
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <div
    v-if="props.open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <!-- Result view: shift already closed, show reconciliation -->
      <template v-if="props.result">
        <div class="mb-4 flex items-center gap-2 text-success-600 dark:text-success-500">
          <CheckCircle2 class="h-6 w-6" aria-hidden="true" />
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">Shift Ditutup</h4>
        </div>
        <dl class="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <div class="flex items-center justify-between text-theme-sm">
            <dt class="text-gray-500 dark:text-gray-400">Kas Awal</dt>
            <dd class="text-gray-800 dark:text-white/90">{{ formatRupiah(props.result.openingCash) }}</dd>
          </div>
          <div class="flex items-center justify-between text-theme-sm">
            <dt class="text-gray-500 dark:text-gray-400">Kas Diharapkan</dt>
            <dd class="text-gray-800 dark:text-white/90">
              {{ props.result.expectedCash !== null ? formatRupiah(props.result.expectedCash) : '—' }}
            </dd>
          </div>
          <div class="flex items-center justify-between text-theme-sm">
            <dt class="text-gray-500 dark:text-gray-400">Kas Aktual</dt>
            <dd class="text-gray-800 dark:text-white/90">
              {{ props.result.actualCash !== null ? formatRupiah(props.result.actualCash) : '—' }}
            </dd>
          </div>
          <div
            class="flex items-center justify-between border-t border-gray-200 pt-3 text-base font-semibold dark:border-gray-800"
          >
            <dt class="text-gray-800 dark:text-white/90">Selisih</dt>
            <dd
              :class="[
                (props.result.discrepancy ?? 0) === 0
                  ? 'text-success-600 dark:text-success-500'
                  : 'text-error-600 dark:text-error-500',
              ]"
            >
              {{ props.result.discrepancy !== null ? formatRupiah(props.result.discrepancy) : '—' }}
            </dd>
          </div>
        </dl>
        <div class="mt-6 flex justify-end">
          <Button size="sm" variant="primary" :on-click="() => emit('close')">Selesai</Button>
        </div>
      </template>

      <!-- Form view: enter actual cash to close -->
      <template v-else>
        <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Tutup Shift Kasir</h4>
        <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Masukkan jumlah kas aktual di laci. Sistem menghitung selisih terhadap kas yang
          diharapkan (hanya pembayaran tunai).
        </p>

        <div class="mb-4">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Kas Aktual (Rp)
          </label>
          <input
            v-model.number="actualCash"
            type="number"
            min="0"
            step="1000"
            class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>

        <div class="mb-4">
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Catatan
          </label>
          <textarea
            v-model="notes"
            rows="2"
            placeholder="Catatan opsional..."
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

        <p
          v-if="props.errorMessage"
          class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ props.errorMessage }}
        </p>

        <div class="flex justify-end gap-3">
          <Button size="sm" variant="outline" :disabled="props.submitting" :on-click="() => emit('close')">
            Batal
          </Button>
          <button
            type="button"
            :disabled="props.submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-error-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-error-600 disabled:cursor-not-allowed disabled:opacity-60"
            @click="onConfirm"
          >
            <LogOut class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {{ props.submitting ? 'Memproses...' : 'Tutup Shift' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>
