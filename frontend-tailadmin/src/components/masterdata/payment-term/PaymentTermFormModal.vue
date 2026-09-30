<script setup lang="ts">
/**
 * PaymentTermFormModal — create/edit modal for a payment term.
 *  - Create: user inputs `code` (required), `name` (required), `dueDays` (int >= 0).
 *  - Edit:   `code` is shown READ-ONLY (immutable); editable name, dueDays, and
 *            active toggle.
 * Self-contained form state; emits `submit` and lets the parent run the
 * mutation. Transparent backdrop per UI standard.
 */
import { ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import type { PaymentTerm } from '@/services/payment-term.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    paymentTerm?: PaymentTerm | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { paymentTerm: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: { code: string; name: string; dueDays: number; isActive: boolean },
  ): void
}>()

const code = ref<string>('')
const name = ref<string>('')
const dueDays = ref<string>('0')
const isActive = ref<boolean>(true)
const localError = ref<string | null>(null)

watch(
  () => [props.open, props.paymentTerm] as const,
  ([open]) => {
    if (open) {
      code.value = props.paymentTerm?.code ?? ''
      name.value = props.paymentTerm?.name ?? ''
      dueDays.value = String(props.paymentTerm?.dueDays ?? 0)
      isActive.value = props.paymentTerm?.isActive ?? true
      localError.value = null
    }
  },
  { immediate: true },
)

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'

const readonlyClass =
  'h-11 w-full rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500 shadow-theme-xs dark:border-gray-800 dark:bg-gray-800 dark:text-gray-400'

function onSubmit(): void {
  const trimmedName = name.value.trim()

  if (props.mode === 'create') {
    const trimmedCode = code.value.trim()
    if (trimmedCode.length === 0) {
      localError.value = 'Kode wajib diisi.'
      return
    }
  }

  if (trimmedName.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }

  const raw = dueDays.value.trim()
  if (raw.length === 0) {
    localError.value = 'Jatuh tempo wajib diisi.'
    return
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    localError.value = 'Jatuh tempo harus berupa bilangan bulat.'
    return
  }
  if (parsed < 0) {
    localError.value = 'Jatuh tempo tidak boleh kurang dari 0.'
    return
  }

  localError.value = null
  emit('submit', {
    code: code.value.trim().toUpperCase(),
    name: trimmedName,
    dueDays: parsed,
    isActive: isActive.value,
  })
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4">
    <div
      class="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/30"
      aria-hidden="true"
      @click="emit('close')"
    ></div>

    <div
      class="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <h4 class="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
        {{ mode === 'edit' ? 'Edit Payment Term' : 'Tambah Payment Term' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Kode<span v-if="mode === 'create'" class="text-error-500">*</span>
          </label>
          <input
            v-if="mode === 'edit'"
            :value="code"
            type="text"
            readonly
            :class="readonlyClass"
          />
          <input
            v-else
            v-model="code"
            type="text"
            placeholder="mis. NET30, COD"
            :class="inputClass"
          />
          <p v-if="mode === 'edit'" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            Kode tidak dapat diubah.
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Nama<span class="text-error-500">*</span>
          </label>
          <input v-model="name" type="text" placeholder="mis. Net 30 Hari" :class="inputClass" />
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
            Jatuh Tempo (hari)<span class="text-error-500">*</span>
          </label>
          <input
            v-model="dueDays"
            type="number"
            min="0"
            step="1"
            placeholder="mis. 30"
            :class="inputClass"
          />
        </div>

        <ToggleSwitch v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ localError || errorMessage }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <Button size="sm" variant="outline" :disabled="submitting" :on-click="() => emit('close')">
            Batal
          </Button>
          <button
            type="submit"
            :disabled="submitting"
            class="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-3 text-sm font-medium text-white shadow-theme-xs transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {{ submitting ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
