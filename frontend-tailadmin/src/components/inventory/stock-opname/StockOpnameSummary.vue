<script setup lang="ts">
/**
 * StockOpnameSummary — read-only header meta card for a Stock Opname. Renders
 * the status badge, outlet, opname date, item count, creation/update times,
 * optional notes, and — once COMPLETED with variance — the generated
 * reconciliation adjustment reference (optional link emitted to the parent).
 * Pure presentation: resolves the outlet id → name via an injected resolver
 * callback so it never fetches or holds lookup state itself.
 */
import { ExternalLink } from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import { BaseButton } from '@/components/ui'
import { formatDate, formatDateTime } from '@/lib/format'
import {
  OPNAME_STATUS_LABELS,
  statusBadgeColor,
  type StockOpname,
} from '@/services/stock-opname.service'

const props = defineProps<{
  opname: StockOpname
  outletName: (id: string) => string
}>()

const emit = defineEmits<{
  (e: 'open-adjustment', adjustmentId: string): void
}>()
</script>

<template>
  <dl class="field-grid">
    <div>
      <dt class="text-muted-xs uppercase">Status</dt>
      <dd class="mt-1">
        <Badge :color="statusBadgeColor(props.opname.status)">
          {{ OPNAME_STATUS_LABELS[props.opname.status] }}
        </Badge>
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Outlet</dt>
      <dd class="mt-1 text-value">
        {{ props.outletName(props.opname.outletId) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Tanggal Opname</dt>
      <dd class="mt-1 text-value">
        {{ formatDate(props.opname.opnameDate) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Jumlah Item</dt>
      <dd class="mt-1 text-value">
        {{ props.opname.items.length }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Dibuat</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.opname.createdAt) }}
      </dd>
    </div>
    <div>
      <dt class="text-muted-xs uppercase">Diperbarui</dt>
      <dd class="mt-1 text-value">
        {{ formatDateTime(props.opname.updatedAt) }}
      </dd>
    </div>

    <div v-if="props.opname.notes" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Catatan</dt>
      <dd class="mt-1 text-body">
        {{ props.opname.notes }}
      </dd>
    </div>

    <div v-if="props.opname.generatedAdjustmentId" class="sm:col-span-2">
      <dt class="text-muted-xs uppercase">Penyesuaian Rekonsiliasi</dt>
      <dd class="mt-1">
        <BaseButton
          size="sm"
          variant="info"
          @click="emit('open-adjustment', props.opname.generatedAdjustmentId!)"
        >
          <template #start-icon><ExternalLink class="h-4 w-4" aria-hidden="true" /></template>
          Lihat Stock Adjustment
        </BaseButton>
      </dd>
    </div>
  </dl>
</template>
