<script setup lang="ts">
/**
 * PurchaseOrderHeaderFields — header inputs for the Purchase Order form:
 * source Purchase Request (APPROVED only), supplier/vendor, order date,
 * payment term override, and notes. Stateless view: values flow via v-model
 * (purchaseRequestId / supplierId / orderDate / paymentTermId / notes) so the
 * parent form owns state, validation, and submission.
 *
 * The destination outlet is inherited from the chosen PR on the backend; here
 * it is shown read-only via `destinationOutletLabel`. The payment-term due-days
 * and the estimated due date are backend-authoritative; `duePreview` is a
 * read-only UI hint computed by the parent (orderDate + dueDays). `disabled`
 * renders the read-only mode.
 *
 * "PR Sumber" and "Vendor" are `EntityCombobox` text autocompletes rather than
 * native <select>s: both candidate lists are already loaded and pre-filtered by
 * the parent, so they run in `mode="client"` and filter locally. The payment-term
 * field stays a native <select> on purpose — it has a meaningful EMPTY option
 * ("Tanpa termin / default vendor"), which a chip-style combobox cannot express.
 *
 * Both fields only emit their `update:*` event: the parent owns the side effects
 * (auto-defaulting the payment term from the supplier, syncing the destination
 * outlet from the PR) through its own watchers, so those keep working unchanged.
 */
import { computed } from 'vue'
import EntityCombobox from '@/components/ui/EntityCombobox.vue'
import { BaseInput, BaseSelect, BaseTextarea } from '@/components/ui'
import type { PurchaseRequest } from '@/services/purchase-request.service'
import type { Supplier } from '@/services/supplier.service'
import type { PaymentTerm } from '@/services/payment-term.service'

const props = defineProps<{
  purchaseRequestId: string
  supplierId: string
  orderDate: string
  paymentTermId: string
  notes: string
  approvedRequests: PurchaseRequest[]
  suppliers: Supplier[]
  paymentTerms: PaymentTerm[]
  prNumber: (id: string) => string
  destinationOutletLabel: string
  duePreview: string | null
  disabled: boolean
  prLocked: boolean
}>()

const emit = defineEmits<{
  (e: 'update:purchaseRequestId', value: string): void
  (e: 'update:supplierId', value: string): void
  (e: 'update:orderDate', value: string): void
  (e: 'update:paymentTermId', value: string): void
  (e: 'update:notes', value: string): void
}>()

const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'

// ── Chip labels for the two comboboxes ────────────────────────────────
// The lists are already loaded by the parent, so the chosen item is resolved
// locally. Both fall back to the raw id, matching the previous <select> behaviour
// (see the parent's `prNumber` fallback) so an unresolvable id stays visible
// rather than rendering a blank chip.
const supplierMap = computed<Map<string, Supplier>>(
  () => new Map(props.suppliers.map((s) => [s.id, s])),
)

const selectedPrLabel = computed<string>(() =>
  props.purchaseRequestId ? props.prNumber(props.purchaseRequestId) : '',
)

const selectedSupplierLabel = computed<string>(() => {
  if (!props.supplierId) {
    return ''
  }
  return supplierMap.value.get(props.supplierId)?.name ?? props.supplierId
})

/** Either read-only flag locks the PR picker; the supplier picker only honours `disabled`. */
const prPickerDisabled = computed<boolean>(() => props.disabled || props.prLocked)
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source Purchase Request — text autocomplete over the pre-filtered list -->
      <div>
        <label :class="labelClass">PR Sumber<span class="text-error-500">*</span></label>
        <EntityCombobox
          :model-value="props.purchaseRequestId"
          :selected-label="selectedPrLabel"
          :items="props.approvedRequests"
          :item-id="(pr) => pr.id"
          :item-label="(pr) => pr.prNumber"
          mode="client"
          placeholder="Ketik nomor PR..."
          empty-text="PR disetujui tidak ditemukan."
          aria-label="Purchase Request sumber"
          :disabled="prPickerDisabled"
          @update:model-value="emit('update:purchaseRequestId', $event)"
        />
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Hanya PR berstatus disetujui yang dapat dijadikan sumber PO.
        </p>
      </div>

      <!-- Destination outlet (inherited from PR, read-only) -->
      <div>
        <label :class="labelClass">Outlet Tujuan</label>
        <div
          class="flex h-11 w-full items-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-300"
        >
          {{ props.destinationOutletLabel || 'Diwarisi dari PR sumber' }}
        </div>
        <p class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          Diwarisi dari PR sumber (tidak dapat diubah).
        </p>
      </div>

      <!-- Supplier / Vendor — text autocomplete -->
      <div>
        <label :class="labelClass">Vendor<span class="text-error-500">*</span></label>
        <EntityCombobox
          :model-value="props.supplierId"
          :selected-label="selectedSupplierLabel"
          :items="props.suppliers"
          :item-id="(supplier) => supplier.id"
          :item-label="(supplier) => supplier.name"
          mode="client"
          placeholder="Ketik untuk mencari vendor..."
          empty-text="Vendor tidak ditemukan."
          aria-label="Vendor purchase order"
          :disabled="props.disabled"
          @update:model-value="emit('update:supplierId', $event)"
        />
      </div>

      <!-- Order Date -->
      <div>
        <label :class="labelClass">Tanggal Order<span class="text-error-500">*</span></label>
        <BaseInput
          id="purchase-order-date"
          :model-value="props.orderDate"
          type="date"
          :disabled="props.disabled"
          @update:model-value="emit('update:orderDate', $event)"
        />
      </div>

      <!-- Payment Term (override, optional; defaults from supplier) -->
      <div class="sm:col-span-2">
        <label :class="labelClass">Termin Pembayaran</label>
        <BaseSelect
          id="purchase-order-payment-term"
          :model-value="props.paymentTermId"
          :options="[
            { value: '', label: 'Tanpa termin / default vendor' },
            ...props.paymentTerms.map((pt) => ({
              value: pt.id,
              label: `${pt.name} (${pt.dueDays} hari)`,
            })),
          ]"
          :disabled="props.disabled"
          @update:model-value="emit('update:paymentTermId', $event)"
        />
        <p v-if="props.duePreview" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          {{ props.duePreview }}
        </p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <BaseTextarea
        id="purchase-order-notes"
        :model-value="props.notes"
        :rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk PO ini..."
        @update:model-value="emit('update:notes', $event)"
      />
    </div>
  </div>
</template>
