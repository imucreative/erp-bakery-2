<script setup lang="ts">
/**
 * SupplierFormModal — create/edit modal for a supplier (name, address, phone,
 * PIC, optional default payment term + active toggle on edit). Self-contained
 * form state; emits `submit` and lets the parent run the mutation. Transparent
 * backdrop per UI standard.
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
import Button from '@/components/ui/Button.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

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
        {{ mode === 'edit' ? 'Edit Supplier' : 'Tambah Supplier' }}
      </h4>

      <form class="space-y-4" @submit.prevent="onSubmit">
        <div>
          <label :class="labelClass">
            Nama<span class="text-error-500">*</span>
          </label>
          <input v-model="name" type="text" placeholder="mis. PT Tepung Sejahtera" :class="inputClass" />
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label :class="labelClass">PIC</label>
            <input v-model="picName" type="text" placeholder="Nama penanggung jawab" :class="inputClass" />
          </div>
          <div>
            <label :class="labelClass">Telepon</label>
            <input v-model="phone" type="text" placeholder="021-555-0200" :class="inputClass" />
          </div>
        </div>

        <div>
          <label :class="labelClass">Alamat</label>
          <textarea
            v-model="address"
            rows="2"
            placeholder="Alamat supplier"
            class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
          ></textarea>
        </div>

        <div>
          <label :class="labelClass">Payment Term (default)</label>
          <div class="relative">
            <select
              v-model="defaultPaymentTermId"
              :disabled="paymentTermsLoading"
              :class="[inputClass, 'appearance-none pe-10', paymentTermsLoading ? 'cursor-not-allowed opacity-60' : '']"
            >
              <option value="">— Tanpa payment term —</option>
              <option v-for="t in paymentTerms" :key="t.id" :value="t.id">
                {{ t.code }} — {{ t.name }}
              </option>
              <option v-if="inactiveCurrentTerm" :value="inactiveCurrentTerm.id">
                {{ inactiveCurrentTerm.label }}
              </option>
            </select>
            <ChevronDownIcon
              class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
            />
          </div>
          <p v-if="paymentTermsLoading" class="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            Memuat payment term...
          </p>
          <p v-else-if="paymentTermsError" class="mt-1 text-theme-xs text-error-500">
            {{ paymentTermsError }}
          </p>
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
