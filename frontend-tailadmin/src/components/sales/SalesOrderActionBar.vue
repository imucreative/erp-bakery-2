<script setup lang="ts">
/**
 * SalesOrderActionBar — right-aligned group of lifecycle action buttons for a
 * Sales Order detail view. Stateless: the parent owns status, permissions, and
 * the submitting flag, and decides which actions are visible via the `show*`
 * props. This component only renders buttons and emits intents:
 *
 *   void   → parent opens the void confirmation modal (PENDING_PAYMENT only)
 *   refund → parent opens the refund confirmation modal (PAID only)
 */
import { Ban, RotateCcw } from 'lucide-vue-next'
import BaseButton from '../ui/BaseButton.vue';

const props = defineProps<{
  showVoid: boolean
  showRefund: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'void'): void
  (e: 'refund'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <BaseButton
      v-if="props.showVoid" 
      variant="danger" 
      :disabled="props.submitting"
      @click="emit('void')">
      <Ban class="h-4 w-4" aria-hidden="true" />
      Batalkan
    </BaseButton>
    <BaseButton
      v-if="props.showRefund"
      variant="warning"
      :disabled="props.submitting"
      @click="emit('refund')">
      <RotateCcw class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      Refund
    </BaseButton>
  </div>
</template>
