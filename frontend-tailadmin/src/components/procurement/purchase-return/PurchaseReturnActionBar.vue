<script setup lang="ts">
/**
 * PurchaseReturnActionBar — right-aligned group of lifecycle action buttons for
 * a Purchase Return detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props. This component only renders buttons and emits intents:
 *
 *   edit     → parent navigates to the edit page
 *   submit   → parent opens the submit confirmation modal
 *   complete → parent opens the complete confirmation modal (posts reversal)
 *   cancel   → parent opens the cancel confirmation modal
 *
 * When no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, Send, PackageCheck, Ban } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showEdit: boolean
  showSubmit: boolean
  showComplete: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'submit'): void
  (e: 'complete'): void
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
      <Send class="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
      Ajukan
    </BaseButton>
    <BaseButton
      v-if="props.showComplete"
      variant="success"
      :loading="props.submitting"
      @click="emit('complete')"
    >
      <PackageCheck class="h-4 w-4" aria-hidden="true" />
      Selesaikan
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
