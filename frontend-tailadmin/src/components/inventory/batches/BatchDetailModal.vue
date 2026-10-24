<script setup lang="ts">
/**
 * BatchDetailModal — read-only detail view of a single inventory batch.
 * Panel and backdrop come from `BaseModal` (`size="lg"`, `scrollable`). Shows the
 * product (name + SKU), outlet, batch number, lot number, available quantity,
 * received/expiry dates, batch status, the backend-derived expiry state, and
 * the non-batch flag. Product/outlet names are resolved by the parent via
 * lookup maps (raw-id fallback). Read-only — no actions beyond closing.
 */
import { computed } from 'vue'
import { BaseAlert, BaseButton, BaseModal } from '@/components/ui'
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
  <BaseModal :open="open" size="lg" scrollable @close="emit('close')">
    <div class="mb-4 flex items-start justify-between gap-3">
      <div>
        <h4 class="modal-title">Detail Batch</h4>
        <p class="mt-0.5 text-meta">Informasi batch inventaris (hanya-baca).</p>
      </div>
    </div>

    <div v-if="loading" class="text-muted py-8 text-center">Memuat detail batch...</div>

    <BaseAlert v-else-if="errorMessage" size="sm">{{ errorMessage }}</BaseAlert>

    <div v-else-if="detail" class="space-y-4">
      <div class="flex flex-col">
        <span class="text-meta uppercase">Produk</span>
        <span class="text-strong">
          {{ product?.name }}
        </span>
        <span v-if="product?.sku" class="text-meta">
          {{ product?.sku }}
        </span>
      </div>

      <div class="field-grid">
        <div class="flex flex-col">
          <span class="text-meta uppercase">Outlet</span>
          <span class="text-value">{{ outletName }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">No. Batch</span>
          <span class="text-value">
            {{
              detail.batch.isNonBatch || !detail.batch.batchNumber
                ? 'Non-batch'
                : detail.batch.batchNumber
            }}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">No. Lot</span>
          <span class="text-value">
            {{ detail.batch.lotNumber ?? '—' }}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Qty Tersedia</span>
          <span class="text-strong">
            {{ formatQtyWithUom(detail.batch.qtyAvailable, uomLabel) }}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Tgl Diterima</span>
          <span class="text-value">
            {{ detail.batch.receivedDate ? formatDate(detail.batch.receivedDate) : '—' }}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Tgl Kedaluwarsa</span>
          <span class="text-value">
            {{ detail.batch.expiredDate ? formatDate(detail.batch.expiredDate) : '—' }}
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Status</span>
          <span>
            <Badge :color="statusColor(detail.batch.status)">
              {{ batchStatusLabel(detail.batch.status) }}
            </Badge>
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Kedaluwarsa</span>
          <span>
            <Badge :color="expiryColor(detail.expiryState)">
              {{ expiryStateLabel(detail.expiryState) }}
            </Badge>
          </span>
        </div>
        <div class="flex flex-col">
          <span class="text-meta uppercase">Non-batch</span>
          <span class="text-value">
            {{ detail.batch.isNonBatch ? 'Ya' : 'Tidak' }}
          </span>
        </div>
      </div>
    </div>

    <div v-else class="text-muted py-8 text-center">Data batch tidak tersedia.</div>

    <div class="mt-6 button-row">
      <BaseButton size="sm" variant="outline" @click="emit('close')">Tutup</BaseButton>
    </div>
  </BaseModal>
</template>
