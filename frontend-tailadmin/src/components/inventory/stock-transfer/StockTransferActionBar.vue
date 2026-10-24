<script setup lang="ts">
/**
 * StockTransferActionBar — right-aligned group of lifecycle action buttons for
 * a Stock Transfer detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props. This component only renders buttons and emits intents:
 *
 *   edit     → parent navigates to the edit page (DRAFT only, .create)
 *   submit   → parent opens the submit confirmation modal (DRAFT → SUBMITTED, .create)
 *   dispatch → parent opens the dispatch confirmation modal (SUBMITTED → IN_TRANSIT, .dispatch)
 *   receive  → parent opens the receive confirmation modal (IN_TRANSIT → COMPLETED, .receive)
 *   cancel   → parent opens the cancel confirmation modal (DRAFT|SUBMITTED, .create)
 *
 * Every button carries a relevant icon (icon + text) per the UI standard. When
 * no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, Send, Truck, PackageCheck, Ban } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showEdit: boolean
  showSubmit: boolean
  showDispatch: boolean
  showReceive: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'submit'): void
  (e: 'dispatch'): void
  (e: 'receive'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <BaseButton v-if="props.showEdit" variant="outline" @click="emit('edit')">
      <template #start-icon><Pencil class="h-4 w-4" aria-hidden="true" /></template>
      Edit
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
      v-if="props.showDispatch"
      variant="primary"
      :disabled="props.submitting"
      @click="emit('dispatch')"
    >
      <template #start-icon><Truck class="h-4 w-4" aria-hidden="true" /></template>
      Kirim
    </BaseButton>
    <BaseButton
      v-if="props.showReceive"
      variant="success"
      :disabled="props.submitting"
      @click="emit('receive')"
    >
      <template #start-icon><PackageCheck class="h-4 w-4" aria-hidden="true" /></template>
      Terima
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
