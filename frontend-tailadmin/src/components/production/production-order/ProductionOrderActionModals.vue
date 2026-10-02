<script setup lang="ts">
/**
 * ProductionOrderActionModals — a single modal driven by `action`
 * ('start' | 'yield' | 'qa' | 'complete' | 'cancel' | null). Most lifecycle
 * endpoints take no body (start/complete) and render a plain confirmation;
 * `yield`, `qa`, and `cancel` collect a small input set:
 *
 *   yield  → actualQty (>0), wasteQty (>=0, default 0), resultExpiredDate
 *            (required), notes? → emits ('yield', RecordYieldPayload)
 *   qa     → passed (Lulus / Gagal) + qaNotes? → emits ('qa', QaCheckPayload)
 *   cancel → reason? → emits ('cancel', { reason? })
 *   start/complete → emits ('confirm')
 *
 * The parent runs the mutation and surfaces backend errors via `errorMessage`,
 * keeping the user on the page (e.g. complete may 400 on insufficient
 * ingredient stock). Local form state resets whenever the active action
 * changes. Transparent backdrop + rounded-3xl panel per the UI standard.
 */
import { computed, ref, watch } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import { toISODate } from '@/lib/format'
import type {
  QaCheckPayload,
  RecordYieldPayload,
} from '@/services/production-order.service'

export type ProductionOrderAction = 'start' | 'yield' | 'qa' | 'complete' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: ProductionOrderAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
  (event: 'yield', payload: RecordYieldPayload): void
  (event: 'qa', payload: QaCheckPayload): void
  (event: 'cancel', payload: { reason?: string }): void
}>()

// ── Local form state (reset on each open) ────────────────────────────
const actualQty = ref<number | null>(null)
const wasteQty = ref<number | null>(0)
const resultExpiredDate = ref<string>('')
const yieldNotes = ref<string>('')
const qaPassed = ref<boolean>(true)
const qaNotes = ref<string>('')
const cancelReason = ref<string>('')
const localError = ref<string | null>(null)

watch(
  () => props.action,
  (next) => {
    localError.value = null
    if (next === 'yield') {
      actualQty.value = null
      wasteQty.value = 0
      resultExpiredDate.value = ''
      yieldNotes.value = ''
    } else if (next === 'qa') {
      qaPassed.value = true
      qaNotes.value = ''
    } else if (next === 'cancel') {
      cancelReason.value = ''
    }
  },
)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

const title = computed<string>(() => {
  switch (props.action) {
    case 'start':
      return 'Mulai Produksi'
    case 'yield':
      return 'Catat Hasil Produksi'
    case 'qa':
      return 'Cek Quality Assurance'
    case 'complete':
      return 'Selesaikan Produksi'
    case 'cancel':
      return 'Batalkan Produksi'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'start':
      return 'Mulai'
    case 'yield':
      return 'Simpan Hasil'
    case 'qa':
      return 'Simpan Hasil QA'
    case 'complete':
      return 'Selesaikan & Posting Stok'
    case 'cancel':
      return 'Batalkan Produksi'
    default:
      return 'Konfirmasi'
  }
})

const confirmClass = computed<string>(() => {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition disabled:cursor-not-allowed disabled:opacity-60'
  if (props.action === 'complete') {
    return `${base} bg-success-500 hover:bg-success-600`
  }
  if (props.action === 'cancel') {
    return `${base} bg-error-500 hover:bg-error-600`
  }
  return `${base} bg-brand-500 hover:bg-brand-600`
})

function onYieldQty(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  actualQty.value = raw === '' ? null : Number(raw)
}

function onWasteQty(event: Event): void {
  const raw = (event.target as HTMLInputElement).value
  wasteQty.value = raw === '' ? 0 : Number(raw)
}

function onConfirm(): void {
  localError.value = null
  if (props.action === 'yield') {
    const actual = Number(actualQty.value) || 0
    if (actual <= 0) {
      localError.value = 'Qty aktual harus lebih dari 0.'
      return
    }
    const waste = Number(wasteQty.value) || 0
    if (waste < 0) {
      localError.value = 'Qty terbuang tidak boleh negatif.'
      return
    }
    if (!resultExpiredDate.value) {
      localError.value = 'Tanggal kedaluwarsa hasil wajib diisi.'
      return
    }
    emit('yield', {
      actualQty: actual,
      wasteQty: waste,
      resultExpiredDate: resultExpiredDate.value,
      notes: yieldNotes.value.trim() || undefined,
    })
    return
  }
  if (props.action === 'qa') {
    emit('qa', {
      passed: qaPassed.value,
      qaNotes: qaNotes.value.trim() || undefined,
    })
    return
  }
  if (props.action === 'cancel') {
    emit('cancel', { reason: cancelReason.value.trim() || undefined })
    return
  }
  // start / complete
  emit('confirm')
}

const todayISO = toISODate(new Date())
</script>

<template>
  <div
    v-if="action"
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
      <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">{{ title }}</h4>

      <!-- START confirmation -->
      <p v-if="action === 'start'" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Mulai memproses perintah produksi ini? Status akan berubah menjadi "Diproses".
      </p>

      <!-- YIELD form -->
      <div v-else-if="action === 'yield'" class="mb-4 space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Catat hasil produksi. Qty aktual dan tanggal kedaluwarsa batch hasil wajib diisi.
        </p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">Qty Aktual<span class="text-error-500">*</span></label>
            <input
              :value="actualQty ?? ''"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              placeholder="0"
              :class="inputClass"
              @input="onYieldQty"
            />
          </div>
          <div>
            <label :class="labelClass">Qty Terbuang (Waste)</label>
            <input
              :value="wasteQty ?? 0"
              type="number"
              min="0"
              step="any"
              inputmode="decimal"
              placeholder="0"
              :class="inputClass"
              @input="onWasteQty"
            />
          </div>
        </div>
        <div>
          <label :class="labelClass">Kedaluwarsa Hasil<span class="text-error-500">*</span></label>
          <input
            v-model="resultExpiredDate"
            type="date"
            :min="todayISO"
            :class="inputClass"
            @click="($event.target as HTMLInputElement).showPicker?.()"
            @focus="($event.target as HTMLInputElement).showPicker?.()"
          />
        </div>
        <div>
          <label :class="labelClass">Catatan</label>
          <textarea
            v-model="yieldNotes"
            rows="2"
            placeholder="Catatan opsional..."
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>
      </div>

      <!-- QA form -->
      <div v-else-if="action === 'qa'" class="mb-4 space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Tentukan hasil pemeriksaan kualitas untuk produksi ini.
        </p>
        <div>
          <label :class="labelClass">Keputusan QA<span class="text-error-500">*</span></label>
          <div class="relative">
            <select
              :value="qaPassed ? 'pass' : 'fail'"
              :class="[inputClass, 'appearance-none pe-10']"
              @change="qaPassed = ($event.target as HTMLSelectElement).value === 'pass'"
            >
              <option value="pass">Lulus (QA Passed)</option>
              <option value="fail">Gagal (QA Failed)</option>
            </select>
            <ChevronDownIcon
              class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
        </div>
        <div>
          <label :class="labelClass">Catatan QA</label>
          <textarea
            v-model="qaNotes"
            rows="2"
            placeholder="Catatan opsional hasil QA..."
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>
      </div>

      <!-- COMPLETE confirmation -->
      <p v-else-if="action === 'complete'" class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Menyelesaikan produksi akan mengonsumsi bahan baku (FEFO) dan — bila QA lulus — membuat
        batch barang jadi. Tindakan ini bersifat final dan tidak dapat dibatalkan.
      </p>

      <!-- CANCEL form -->
      <div v-else-if="action === 'cancel'" class="mb-4 space-y-4">
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Batalkan perintah produksi ini? Tindakan ini bersifat final.
        </p>
        <div>
          <label :class="labelClass">Alasan</label>
          <textarea
            v-model="cancelReason"
            rows="2"
            placeholder="Alasan pembatalan (opsional)..."
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>
      </div>

      <!-- Warnings for the final / irreversible actions -->
      <div
        v-if="action === 'complete' || action === 'cancel'"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span v-if="action === 'complete'">
          Setelah selesai, perintah produksi tidak bisa diubah atau dibatalkan.
        </span>
        <span v-else>Perintah produksi yang dibatalkan tidak dapat dikembalikan.</span>
      </div>

      <!-- Local validation error -->
      <p
        v-if="localError"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ localError }}
      </p>

      <!-- Backend error (mutation failure keeps the user here) -->
      <p
        v-if="errorMessage"
        class="mb-4 rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
          Kembali
        </Button>
        <button type="button" :disabled="submitting" :class="confirmClass" @click="onConfirm">
          {{ submitting ? 'Memproses...' : confirmLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
