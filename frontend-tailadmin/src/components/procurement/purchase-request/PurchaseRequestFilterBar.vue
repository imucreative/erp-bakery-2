<script setup lang="ts">
/**
 * PurchaseRequestFilterBar — search (prNumber) + status filter toolbar for the
 * PR list. Native select wrapped with a ChevronDownIcon per the UI standard.
 * Two-way binds `search` and `status` via v-model:search / v-model:status.
 */
import { BaseInput, BaseSelect } from '@/components/ui'
import {
  PURCHASE_REQUEST_STATUSES,
  PURCHASE_REQUEST_STATUS_LABELS,
} from '@/services/purchase-request.service'
import type { StatusFilter } from '@/composables/usePurchaseRequests'

defineProps<{
  search: string
  status: StatusFilter
}>()

const emit = defineEmits<{
  (event: 'update:search', value: string): void
  (event: 'update:status', value: StatusFilter): void
}>()

const statusOptions = [
  { value: 'all', label: 'Semua Status' },
  ...PURCHASE_REQUEST_STATUSES.map((status) => ({
    value: status,
    label: PURCHASE_REQUEST_STATUS_LABELS[status],
  })),
]
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="relative w-full sm:max-w-xs">
      <BaseInput
        id="purchase-request-search"
        :model-value="search"
        placeholder="Cari nomor PR..."
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="relative w-full sm:w-55">
      <BaseSelect
        id="purchase-request-status"
        :model-value="status"
        :options="statusOptions"
        @update:model-value="emit('update:status', $event as StatusFilter)"
      />
    </div>
  </div>
</template>
