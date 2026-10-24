<script setup lang="ts">
/**
 * StockOpnameActionBar — right-aligned group of lifecycle action buttons for a
 * Stock Opname detail view. Stateless: the parent view owns status, permissions,
 * and the submitting flag, and decides which actions are visible via the `show*`
 * props. This component only renders buttons and emits intents:
 *
 *   start    → DRAFT → COUNTING (snapshots batches)       (.create)
 *   submit   → COUNTING → SUBMITTED                        (.update)
 *   approve  → SUBMITTED → APPROVED                        (.approve)
 *   complete → APPROVED → COMPLETED (posts stock, final)   (.complete)
 *   cancel   → DRAFT|COUNTING|SUBMITTED → CANCELLED        (.update)
 *
 * Every button carries a relevant icon (icon + text) per the UI standard. When
 * no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Play, Send, CheckCheck, PackageCheck, Ban } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showStart: boolean
  showSubmit: boolean
  showApprove: boolean
  showComplete: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'start'): void
  (e: 'submit'): void
  (e: 'approve'): void
  (e: 'complete'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <BaseButton
      v-if="props.showStart"
      variant="primary"
      :disabled="props.submitting"
      @click="emit('start')"
    >
      <template #start-icon><Play class="h-4 w-4" aria-hidden="true" /></template>
      Mulai Penghitungan
    </BaseButton>
    <BaseButton
      v-if="props.showSubmit"
      variant="primary"
      :disabled="props.submitting"
      @click="emit('submit')"
    >
      <template #start-icon><Send class="h-4 w-4" aria-hidden="true" /></template>
      Ajukan
    </BaseButton>
    <BaseButton
      v-if="props.showApprove"
      variant="success"
      :disabled="props.submitting"
      @click="emit('approve')"
    >
      <template #start-icon><CheckCheck class="h-4 w-4" aria-hidden="true" /></template>
      Setujui
    </BaseButton>
    <BaseButton
      v-if="props.showComplete"
      variant="success"
      :disabled="props.submitting"
      @click="emit('complete')"
    >
      <template #start-icon><PackageCheck class="h-4 w-4" aria-hidden="true" /></template>
      Selesaikan
    </BaseButton>
    <BaseButton
      v-if="props.showCancel"
      variant="danger"
      :disabled="props.submitting"
      @click="emit('cancel')"
    >
      <template #start-icon><Ban class="h-4 w-4" aria-hidden="true" /></template>
      Batalkan
    </BaseButton>
  </div>
</template>
