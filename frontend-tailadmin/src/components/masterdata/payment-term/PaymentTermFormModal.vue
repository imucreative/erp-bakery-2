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
import { Save, X } from 'lucide-vue-next'
import { BaseButton, BaseFormField, BaseInput, BaseToggle } from '@/components/ui'
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

  const raw = String(dueDays.value ?? '').trim()
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
  <div
    v-if="open"
    class="fixed inset-0 z-99999 flex items-center justify-center overflow-y-auto p-4"
  >
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
        <BaseFormField label="Kode" field-id="payment-term-code" :required="mode === 'create'">
          <BaseInput v-if="mode === 'edit'" id="payment-term-code" :model-value="code" readonly />
          <BaseInput v-else id="payment-term-code" v-model="code" placeholder="mis. NET30, COD" />
          <p v-if="mode === 'edit'" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
            Kode tidak dapat diubah.
          </p>
        </BaseFormField>

        <BaseFormField
          label="Nama"
          field-id="payment-term-name"
          required
          :error="localError && !name.trim() ? localError : null"
        >
          <BaseInput id="payment-term-name" v-model="name" placeholder="mis. Net 30 Hari" />
        </BaseFormField>

        <BaseFormField label="Jatuh Tempo (hari)" field-id="payment-term-due-days" required>
          <BaseInput
            id="payment-term-due-days"
            v-model="dueDays"
            type="number"
            min="0"
            step="1"
            placeholder="mis. 30"
          />
        </BaseFormField>

        <BaseToggle v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

        <p
          v-if="localError || errorMessage"
          class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
        >
          {{ localError || errorMessage }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
            <template #start-icon><X class="h-4 w-4" aria-hidden="true" /></template>
            Batal
          </BaseButton>
          <BaseButton
            type="submit"
            variant="success"
            :loading="submitting"
            loading-text="Menyimpan..."
          >
            <template #start-icon><Save class="h-4 w-4" aria-hidden="true" /></template>
            Simpan
          </BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>
