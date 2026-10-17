<script setup lang="ts">
/**
 * BatchDetailModal — read-only detail view of a single inventory batch.
 * Transparent backdrop + rounded-3xl panel per the UI standard. Shows the
 * product (name + SKU), outlet, batch number, lot number, available quantity,
 * received/expiry dates, batch status, the backend-derived expiry state, and
 * the non-batch flag. Product/outlet names are resolved by the parent via
 * lookup maps (raw-id fallback). Read-only — no actions beyond closing.
 */
import { computed } from 'vue'
import { BaseButton } from '@/components/ui'
import Badge from '@/components/ui/Badge.vue'
import { formatDate, formatQtyWithUom } from '@/lib/format'
import {
  batchStatusLabel,
  expiryStateLabel,
  type BatchWithExpiry,
  type ExpiryState,
} from '@/services/inventory.service'

interface ProductDisplay {
  name: string
  sku: string
}

const props = withDefaults(
  defineProps<{
    open: boolean
    detail?: BatchWithExpiry | null
    loading?: boolean
    errorMessage?: string | null
    outletNames: Map<string, string>
    productNames: Map<string, ProductDisplay>
    /** productId → base UOM label, resolved once by the parent ('' = no unit). */
    productUomLabels: Map<string, string>
  }>(),
  { detail: null, loading: false, errorMessage: null },
)

/** Base unit of the batch's product; '' when unresolved (qty shown bare). */
const uomLabel = computed<string>(() => {
  if (!props.detail) {
    return ''
  }
  return props.productUomLabels.get(props.detail.batch.productId) ?? ''
})

const emit = defineEmits<{ (event: 'close'): void }>()

const product = computed<ProductDisplay | null>(() => {
  if (!props.detail) {
    return null
  }
  return (
    props.productNames.get(props.detail.batch.productId) ?? {
      name: props.detail.batch.productId,
      sku: '',
    }
  )
})

const outletName = computed<string>(() => {
  if (!props.detail) {
    return ''
  }
  return props.outletNames.get(props.detail.batch.outletId) ?? props.detail.batch.outletId
})

type ExpiryColor = 'success' | 'error' | 'warning' | 'light'

function expiryColor(state: ExpiryState): ExpiryColor {
  if (state === 'EXPIRED') {
    return 'error'
  }
  if (state === 'EXPIRING_SOON') {
    return 'warning'
  }
  if (state === 'OK') {
    return 'success'
  }
  return 'light'
}

type BatchStatusColor = 'success' | 'error' | 'light' | 'warning'

function statusColor(status: string): BatchStatusColor {
  if (status === 'ACTIVE') {
    return 'success'
  }
  if (status === 'EXPIRED') {
    return 'error'
  }
  if (status === 'QUARANTINE') {
    return 'warning'
  }
  return 'light'
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
      class="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 shadow-theme-lg dark:border-gray-800 dark:bg-gray-900"
    >
      <div class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 class="text-lg font-semibold text-gray-800 dark:text-white/90">Detail Batch</h4>
          <p class="mt-0.5 text-theme-xs text-gray-500 dark:text-gray-400">
            Informasi batch inventaris (hanya-baca).
          </p>
        </div>
      </div>

      <div v-if="loading" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Memuat detail batch...
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-lg border border-error-500/40 bg-error-50 px-3 py-2 text-sm text-error-600 dark:bg-error-500/10 dark:text-error-400"
      >
        {{ errorMessage }}
      </div>

      <div v-else-if="detail" class="space-y-4">
        <div class="flex flex-col">
          <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">Produk</span>
          <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
            {{ product?.name }}
          </span>
          <span v-if="product?.sku" class="text-theme-xs text-gray-500 dark:text-gray-400">
            {{ product?.sku }}
          </span>
        </div>

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">Outlet</span>
            <span class="text-theme-sm text-gray-800 dark:text-white/90">{{ outletName }}</span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">No. Batch</span>
            <span class="text-theme-sm text-gray-800 dark:text-white/90">
              {{
                detail.batch.isNonBatch || !detail.batch.batchNumber
                  ? 'Non-batch'
                  : detail.batch.batchNumber
              }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">No. Lot</span>
            <span class="text-theme-sm text-gray-800 dark:text-white/90">
              {{ detail.batch.lotNumber ?? '—' }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400"
              >Qty Tersedia</span
            >
            <span class="text-theme-sm font-medium text-gray-800 dark:text-white/90">
              {{ formatQtyWithUom(detail.batch.qtyAvailable, uomLabel) }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400"
              >Tgl Diterima</span
            >
            <span class="text-theme-sm text-gray-800 dark:text-white/90">
              {{ detail.batch.receivedDate ? formatDate(detail.batch.receivedDate) : '—' }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400"
              >Tgl Kedaluwarsa</span
            >
            <span class="text-theme-sm text-gray-800 dark:text-white/90">
              {{ detail.batch.expiredDate ? formatDate(detail.batch.expiredDate) : '—' }}
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">Status</span>
            <span>
              <Badge :color="statusColor(detail.batch.status)">
                {{ batchStatusLabel(detail.batch.status) }}
              </Badge>
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400"
              >Kedaluwarsa</span
            >
            <span>
              <Badge :color="expiryColor(detail.expiryState)">
                {{ expiryStateLabel(detail.expiryState) }}
              </Badge>
            </span>
          </div>
          <div class="flex flex-col">
            <span class="text-theme-xs uppercase text-gray-500 dark:text-gray-400">Non-batch</span>
            <span class="text-theme-sm text-gray-800 dark:text-white/90">
              {{ detail.batch.isNonBatch ? 'Ya' : 'Tidak' }}
            </span>
          </div>
        </div>
      </div>

      <div v-else class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Data batch tidak tersedia.
      </div>

      <div class="mt-6 flex justify-end">
        <BaseButton size="sm" variant="outline" @click="emit('close')">Tutup</BaseButton>
      </div>
    </div>
  </div>
</template>
