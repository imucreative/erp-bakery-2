<script setup lang="ts">
/**
 * PurchaseOrderActionBar — right-aligned group of lifecycle action buttons for
 * a Purchase Order detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props. This component only renders buttons and emits intents:
 *
 *   edit    → parent navigates to the edit page
 *   submit  → parent submits the DRAFT (inline, no modal)
 *   approve → parent opens the approve confirmation modal
 *   reject  → parent opens the reject confirmation modal
 *   cancel  → parent opens the cancel confirmation modal
 *
 * When no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, Send, Check, X, Ban } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showEdit: boolean
  showSubmit: boolean
  showApprove: boolean
  showReject: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'submit'): void
  (e: 'approve'): void
  (e: 'reject'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <BaseButton v-if="props.showEdit" variant="outline" @click="emit('edit')">
      <Pencil class="h-4 w-4" aria-hidden="true" />
      Edit
    </BaseButton>
    <BaseButton
      v-if="props.showSubmit"
      variant="primary"
      :loading="props.submitting"
      @click="emit('submit')"
    >
      <Send class="h-4 w-4" aria-hidden="true" />
      Ajukan
    </BaseButton>
    <BaseButton
      v-if="props.showApprove"
      variant="success"
      :disabled="props.submitting"
      @click="emit('approve')"
    >
      <Check class="h-4 w-4" aria-hidden="true" />
      Setujui
    </BaseButton>
    <BaseButton
      v-if="props.showReject"
      variant="danger"
      :disabled="props.submitting"
      @click="emit('reject')"
    >
      <X class="h-4 w-4" aria-hidden="true" />
      Tolak
    </BaseButton>
    <BaseButton
      v-if="props.showCancel"
      variant="danger"
      :disabled="props.submitting"
      @click="emit('cancel')"
    >
      <Ban class="h-4 w-4" aria-hidden="true" />
      Batalkan
    </BaseButton>
  </div>
</template>
