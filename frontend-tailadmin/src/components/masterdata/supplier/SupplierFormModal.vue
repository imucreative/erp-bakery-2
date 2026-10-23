<script setup lang="ts">
/**
 * SupplierFormModal — create/edit modal for a supplier (name, address, phone,
 * PIC, optional default payment term + active toggle on edit). Self-contained
 * form state; emits `submit` and lets the parent run the mutation. Backdrop,
 * Esc-close, and panel chrome come from BaseModal.
 *
 * Payment Term is OPTIONAL. Options are loaded via paymentTermService.lookup()
 * (active-only) when the modal opens. On CREATE the field emits the selected id
 * or undefined when blank; on EDIT it emits the selected id or `null` to clear.
 *
 * Edge case — inactive current PT: the lookup returns active-only terms, so a
 * supplier that still references a now-inactive PT would lose its selection.
 * To avoid a silently-cleared value, we synthesize a "(nonaktif)" option from
 * the supplier's defaultPaymentTermId/Code/Name so the current selection stays
 * visible and unchanged unless the user picks something else.
 */
import { computed, ref, watch } from 'vue'
import { Save, X } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseFormField,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTextarea,
  BaseToggle,
} from '@/components/ui'
import type { Supplier } from '@/services/supplier.service'
import { paymentTermService, type PaymentTerm } from '@/services/payment-term.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    mode: 'create' | 'edit'
    supplier?: Supplier | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { supplier: null, submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (
    event: 'submit',
    payload: {
      name: string
      address: string
      phone: string
      picName: string
      isActive: boolean
      defaultPaymentTermId: string | null
    },
  ): void
}>()

const name = ref<string>('')
const address = ref<string>('')
const phone = ref<string>('')
const picName = ref<string>('')
const isActive = ref<boolean>(true)
const defaultPaymentTermId = ref<string>('')
const localError = ref<string | null>(null)

// Payment term lookup (active-only) loaded when the modal opens.
const paymentTerms = ref<PaymentTerm[]>([])
const paymentTermsLoading = ref<boolean>(false)
const paymentTermsError = ref<string | null>(null)

async function loadPaymentTerms(): Promise<void> {
  paymentTermsLoading.value = true
  paymentTermsError.value = null
  try {
    paymentTerms.value = await paymentTermService.lookup()
  } catch {
    paymentTerms.value = []
    paymentTermsError.value = 'Gagal memuat payment term.'
  } finally {
    paymentTermsLoading.value = false
  }
}

// If the supplier's current PT is not in the active-only lookup (e.g. it was
// deactivated), surface it as a synthetic "(nonaktif)" option so the selection
// stays visible instead of silently reverting to blank.
const inactiveCurrentTerm = computed<{ id: string; label: string } | null>(() => {
  const id = props.supplier?.defaultPaymentTermId
  if (!id) {
    return null
  }
  if (paymentTerms.value.some((t) => t.id === id)) {
    return null
  }
  const code = props.supplier?.defaultPaymentTermCode
  const termName = props.supplier?.defaultPaymentTermName
  const base = [code, termName].filter(Boolean).join(' — ') || 'Payment term saat ini'
  return { id, label: `${base} (nonaktif)` }
})

watch(
  () => [props.open, props.supplier] as const,
  ([open]) => {
    if (open) {
      name.value = props.supplier?.name ?? ''
      address.value = props.supplier?.address ?? ''
      phone.value = props.supplier?.phone ?? ''
      picName.value = props.supplier?.picName ?? ''
      isActive.value = props.supplier?.isActive ?? true
      defaultPaymentTermId.value = props.supplier?.defaultPaymentTermId ?? ''
      localError.value = null
      void loadPaymentTerms()
    }
  },
  { immediate: true },
)

const paymentTermOptions = computed(() => [
  ...paymentTerms.value.map((term) => ({
    label: `${term.code} — ${term.name}`,
    value: term.id,
  })),
  ...(inactiveCurrentTerm.value
    ? [{ label: inactiveCurrentTerm.value.label, value: inactiveCurrentTerm.value.id }]
    : []),
])

function onSubmit(): void {
  const trimmed = name.value.trim()
  if (trimmed.length === 0) {
    localError.value = 'Nama wajib diisi.'
    return
  }
  localError.value = null
  emit('submit', {
    name: trimmed,
    address: address.value.trim(),
    phone: phone.value.trim(),
    picName: picName.value.trim(),
    isActive: isActive.value,
    defaultPaymentTermId: defaultPaymentTermId.value === '' ? null : defaultPaymentTermId.value,
  })
}
</script>

<template>
  <BaseModal :open="open" size="lg" @close="emit('close')">
    <h4 class="modal-title mb-4">
      {{ mode === 'edit' ? 'Edit Supplier' : 'Tambah Supplier' }}
    </h4>

    <form class="space-y-4" @submit.prevent="onSubmit">
      <BaseFormField
        label="Nama"
        field-id="supplier-name"
        required
        :error="localError && !name.trim() ? localError : null"
      >
        <BaseInput id="supplier-name" v-model="name" placeholder="mis. PT Tepung Sejahtera" />
      </BaseFormField>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BaseFormField label="PIC" field-id="supplier-pic">
          <BaseInput id="supplier-pic" v-model="picName" placeholder="Nama penanggung jawab" />
        </BaseFormField>
        <BaseFormField label="Telepon" field-id="supplier-phone">
          <BaseInput id="supplier-phone" v-model="phone" type="tel" placeholder="021-555-0200" />
        </BaseFormField>
      </div>

      <BaseFormField label="Alamat" field-id="supplier-address">
        <BaseTextarea
          id="supplier-address"
          v-model="address"
          :rows="2"
          placeholder="Alamat supplier"
        />
      </BaseFormField>

      <BaseFormField label="Payment Term (default)" field-id="supplier-payment-term">
        <BaseSelect
          id="supplier-payment-term"
          v-model="defaultPaymentTermId"
          :options="paymentTermOptions"
          :disabled="paymentTermsLoading"
          placeholder="Tanpa payment term"
        />
        <p v-if="paymentTermsLoading" class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
          Memuat payment term...
        </p>
        <p v-else-if="paymentTermsError" class="mt-1 text-theme-xs text-error-500">
          {{ paymentTermsError }}
        </p>
      </BaseFormField>

      <BaseToggle v-if="mode === 'edit'" v-model="isActive" label="Aktif" />

      <BaseAlert :message="localError || errorMessage" size="sm" />

      <div class="flex justify-end gap-3 pt-2">
        <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
          <template #start-icon>
            <X class="h-4 w-4" aria-hidden="true" />
          </template>
          Batal
        </BaseButton>
        <BaseButton
          type="submit"
          variant="success"
          :loading="submitting"
          loading-text="Menyimpan..."
        >
          <template #start-icon>
            <Save class="h-4 w-4" aria-hidden="true" />
          </template>
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>
