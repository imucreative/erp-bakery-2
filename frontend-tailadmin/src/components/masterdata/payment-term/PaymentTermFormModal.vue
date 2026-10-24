<script setup lang="ts">
/**
 * PaymentTermFormModal — create/edit modal for a payment term.
 *  - Create: user inputs `code` (required), `name` (required), `dueDays` (int >= 0).
 *  - Edit:   `code` is shown READ-ONLY (immutable); editable name, dueDays, and
 *            active toggle.
 * Self-contained form state; emits `submit` and lets the parent run the
 * mutation. Backdrop, Esc-close, and panel chrome come from BaseModal.
 */
import { ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseToggle,
} from '@/components/ui'
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
  <BaseModal :open="open" size="lg" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit Payment Term' : 'Tambah Payment Term' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField label="Kode" field-id="payment-term-code" :required="mode === 'create'">
        <BaseInput v-if="mode === 'edit'" id="payment-term-code" :model-value="code" readonly />
        <BaseInput v-else id="payment-term-code" v-model="code" placeholder="mis. NET30, COD" />
        <p v-if="mode === 'edit'" class="mt-1 text-muted-xs">Kode tidak dapat diubah.</p>
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

      <BaseAlert :message="localError || errorMessage" size="sm" />

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
  </BaseModal>
</template>
