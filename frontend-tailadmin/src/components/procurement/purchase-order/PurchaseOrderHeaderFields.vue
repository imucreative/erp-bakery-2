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
 */
import ChevronDownIcon from '@/icons/ChevronDownIcon.vue'
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

const inputClass =
  'h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30'
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400'
</script>

<template>
  <div class="space-y-6">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <!-- Source Purchase Request -->
      <div>
        <label :class="labelClass">PR Sumber<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.purchaseRequestId"
            :disabled="props.disabled || props.prLocked"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:purchaseRequestId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih PR (status disetujui)</option>
            <option v-for="pr in props.approvedRequests" :key="pr.id" :value="pr.id">
              {{ pr.prNumber }}
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
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

      <!-- Supplier / Vendor -->
      <div>
        <label :class="labelClass">Vendor<span class="text-error-500">*</span></label>
        <div class="relative">
          <select
            :value="props.supplierId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:supplierId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="" disabled>Pilih vendor</option>
            <option v-for="s in props.suppliers" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
      </div>

      <!-- Order Date -->
      <div>
        <label :class="labelClass">Tanggal Order<span class="text-error-500">*</span></label>
        <input
          :value="props.orderDate"
          type="date"
          :disabled="props.disabled"
          :class="inputClass"
          @click="($event.target as HTMLInputElement).showPicker?.()"
          @focus="($event.target as HTMLInputElement).showPicker?.()"
          @input="emit('update:orderDate', ($event.target as HTMLInputElement).value)"
        />
      </div>

      <!-- Payment Term (override, optional; defaults from supplier) -->
      <div class="sm:col-span-2">
        <label :class="labelClass">Termin Pembayaran</label>
        <div class="relative">
          <select
            :value="props.paymentTermId"
            :disabled="props.disabled"
            :class="[inputClass, 'appearance-none pe-10']"
            @change="emit('update:paymentTermId', ($event.target as HTMLSelectElement).value)"
          >
            <option value="">Tanpa termin / default vendor</option>
            <option v-for="pt in props.paymentTerms" :key="pt.id" :value="pt.id">
              {{ pt.name }} ({{ pt.dueDays }} hari)
            </option>
          </select>
          <ChevronDownIcon
            class="pointer-events-none absolute inset-y-0 end-3 my-auto h-5 w-5 text-gray-500 dark:text-gray-400"
          />
        </div>
        <p v-if="props.duePreview" class="mt-1 text-theme-xs text-gray-400 dark:text-gray-500">
          {{ props.duePreview }}
        </p>
      </div>
    </div>

    <div>
      <label :class="labelClass">Catatan</label>
      <textarea
        :value="props.notes"
        rows="2"
        :disabled="props.disabled"
        placeholder="Catatan opsional untuk PO ini..."
        class="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        @input="emit('update:notes', ($event.target as HTMLTextAreaElement).value)"
      ></textarea>
    </div>
  </div>
</template>
