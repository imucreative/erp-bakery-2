<script setup lang="ts">
/**
 * StockOpnameActionModals — a single confirmation modal driven by `action`
 * ('start' | 'submit' | 'approve' | 'complete' | 'cancel' | null). The backend
 * lifecycle endpoints take NO request body, so this modal is a plain
 * confirmation with no fields — it only emits `confirm`. Complete explicitly
 * warns that it auto-generates a reconciliation Stock Adjustment and posts stock
 * (final). The parent runs the mutation and surfaces backend errors via
 * `errorMessage`, keeping the user on the page. Transparent backdrop +
 * rounded-3xl panel per the UI standard.
 */
import { computed } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

export type StockOpnameAction = 'start' | 'submit' | 'approve' | 'complete' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: StockOpnameAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm'): void
}>()

const isComplete = computed<boolean>(() => props.action === 'complete')
const isCancel = computed<boolean>(() => props.action === 'cancel')

const title = computed<string>(() => {
  switch (props.action) {
    case 'start':
      return 'Mulai Penghitungan'
    case 'submit':
      return 'Ajukan Stock Opname'
    case 'approve':
      return 'Setujui Stock Opname'
    case 'complete':
      return 'Selesaikan Stock Opname'
    case 'cancel':
      return 'Batalkan Stock Opname'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'start':
      return 'Mulai penghitungan? Semua batch aktif outlet akan dikunci dan di-snapshot menjadi item dengan system qty beku.'
    case 'submit':
      return 'Ajukan opname ini untuk persetujuan? Qty fisik tidak dapat diubah setelah diajukan.'
    case 'approve':
      return 'Setujui opname ini? Setelah disetujui dokumen siap diselesaikan untuk memposting rekonsiliasi stok.'
    case 'complete':
      return 'Menyelesaikan opname ini akan otomatis membuat penyesuaian stok rekonsiliasi untuk setiap selisih dan memposting stok ke inventory. Tindakan ini bersifat final dan tidak dapat dibatalkan.'
    case 'cancel':
      return 'Batalkan opname ini? Tindakan ini bersifat final dan outlet akan dibuka kembali.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'start':
      return 'Mulai'
    case 'submit':
      return 'Ajukan'
    case 'approve':
      return 'Setujui'
    case 'complete':
      return 'Selesaikan & Posting Stok'
    case 'cancel':
      return 'Batalkan'
    default:
      return 'Konfirmasi'
  }
})

const confirmVariant = computed<'primary' | 'success' | 'danger'>(() => {
  if (props.action === 'complete') return 'success'
  if (props.action === 'cancel') return 'danger'
  return 'primary'
})
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
      <h4 class="modal-title mb-2">{{ title }}</h4>
      <p class="text-muted mb-4">{{ description }}</p>

      <div
        v-if="isComplete || isCancel"
        class="mb-4 flex items-start gap-2 rounded-lg border border-warning-500/40 bg-warning-50 px-3 py-2 text-sm text-warning-600 dark:bg-warning-500/10 dark:text-orange-400"
      >
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span v-if="isComplete"> Setelah selesai, opname tidak bisa diubah atau dibatalkan. </span>
        <span v-else>Opname yang dibatalkan tidak dapat dikembalikan.</span>
      </div>

      <p v-if="errorMessage" class="alert-error mb-4 px-3 py-2">
        {{ errorMessage }}
      </p>

      <div class="flex justify-end gap-3">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          Kembali
        </BaseButton>
        <BaseButton
          size="sm"
          :variant="confirmVariant"
          :disabled="submitting"
          :loading="submitting"
          loading-text="Memproses..."
          @click="emit('confirm')"
        >
          {{ confirmLabel }}
        </BaseButton>
      </div>
    </div>
  </div>
</template>
