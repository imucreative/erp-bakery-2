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
import { BaseAlert, BaseButton, BaseInput, BaseModal, BaseTextarea } from '@/components/ui'
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
    actualCash: Number(actualCash.value) >= 0 ? Number(actualCash.value) : 0,
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <BaseModal :open="props.open" @close="emit('close')">
    <!-- Result view: shift already closed, show reconciliation -->
    <template v-if="props.result">
      <div class="mb-4 flex items-center gap-2 text-success-600 dark:text-success-500">
        <CheckCircle2 class="h-6 w-6" aria-hidden="true" />
        <h4 class="modal-title">Shift Ditutup</h4>
      </div>
      <dl class="space-y-3 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
        <div class="flex items-center justify-between text-theme-sm">
          <dt class="text-muted">Kas Awal</dt>
          <dd class="text-value">
            {{ formatRupiah(props.result.openingCash) }}
          </dd>
        </div>
        <div class="flex items-center justify-between text-theme-sm">
          <dt class="text-muted">Kas Diharapkan</dt>
          <dd class="text-value">
            {{ props.result.expectedCash !== null ? formatRupiah(props.result.expectedCash) : '—' }}
          </dd>
        </div>
        <div class="flex items-center justify-between text-theme-sm">
          <dt class="text-muted">Kas Aktual</dt>
          <dd class="text-value">
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
      <div class="mt-6 button-row">
        <BaseButton size="sm" variant="primary" @click="emit('close')">Selesai</BaseButton>
      </div>
    </template>

    <!-- Form view: enter actual cash to close -->
    <template v-else>
      <h4 class="modal-title mb-2">Tutup Shift Kasir</h4>
      <p class="text-muted mb-4">
        Masukkan jumlah kas aktual di laci. Sistem menghitung selisih terhadap kas yang diharapkan
        (hanya pembayaran tunai).
      </p>

      <div class="mb-4">
        <label class="form-label"> Kas Aktual (Rp) </label>
        <BaseInput
          id="close-shift-actual-cash"
          :model-value="actualCash"
          type="number"
          min="0"
          step="1000"
          @update:model-value="actualCash = Number($event)"
        />
      </div>

      <div class="mb-4">
        <label class="form-label"> Catatan </label>
        <BaseTextarea
          id="close-shift-notes"
          v-model="notes"
          :rows="2"
          placeholder="Catatan opsional..."
        />
      </div>

      <BaseAlert :message="props.errorMessage" size="sm" class="mb-4" />

      <div class="button-row">
        <BaseButton size="sm" variant="outline" :disabled="props.submitting" @click="emit('close')">
          Batal
        </BaseButton>
        <BaseButton
          size="sm"
          variant="danger"
          :loading="props.submitting"
          loading-text="Memproses..."
          :disabled="props.submitting"
          @click="onConfirm"
        >
          <template #start-icon>
            <LogOut class="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
          </template>
          Tutup Shift
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>
