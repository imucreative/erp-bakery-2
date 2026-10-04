<script setup lang="ts">
/**
 * OpenShiftModal — open a new cashier shift: outlet select (from accessible
 * outlets), opening cash, optional notes. Stateless: the parent owns the
 * submitting flag and surfaces backend errors via `errorMessage`, keeping the
 * modal open on failure. Transparent backdrop per UI standard.
 */
import { ref, watch } from 'vue'
import { DoorOpen } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
import type { Outlet } from '@/services/outlet.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    outlets: Outlet[]
    defaultOutletId?: string
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { defaultOutletId: '', submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payload: { outletId: string; openingCash: number; notes: string }): void
}>()

const outletId = ref<string>('')
const openingCash = ref<number>(0)
const notes = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      outletId.value = props.defaultOutletId || props.outlets[0]?.id || ''
      openingCash.value = 0
      notes.value = ''
    }
  },
)

function onConfirm(): void {
  if (!outletId.value) {
    return
  }
  emit('confirm', {
    outletId: outletId.value,
    openingCash: openingCash.value >= 0 ? openingCash.value : 0,
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
      <h4 class="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">Buka Shift Kasir</h4>
      <p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Pilih outlet dan masukkan kas awal untuk memulai shift.
      </p>

      <div class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Outlet
        </label>
        <div class="relative">
          <select
            v-model="outletId"
            class="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 pe-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          >
            <option value="" disabled>Pilih outlet</option>
            <option v-for="o in props.outlets" :key="o.id" :value="o.id">{{ o.name }}</option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute end-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>

      <div class="mb-4">
        <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
          Kas Awal (Rp)
        </label>
        <input
          v-model.number="openingCash"
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
          :disabled="props.submitting || !outletId"
          class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          @click="onConfirm"
        >
          <DoorOpen class="h-4 w-4" aria-hidden="true" />
          {{ props.submitting ? 'Memproses...' : 'Buka Shift' }}
        </button>
      </div>
    </div>
  </div>
</template>
