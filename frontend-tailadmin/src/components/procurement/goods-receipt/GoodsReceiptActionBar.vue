<script setup lang="ts">
/**
 * GoodsReceiptActionBar — right-aligned group of lifecycle action buttons for a
 * Goods Receipt detail view. Stateless: the parent view owns status,
 * permissions, and the submitting flag, and decides which actions are visible
 * via the `show*` props. This component only renders buttons and emits intents:
 *
 *   edit     → parent navigates to the edit page
 *   complete → parent opens the complete confirmation modal (posts inventory)
 *   cancel   → parent opens the cancel confirmation modal
 *
 * When no action is available the parent hides the whole bar (see hasAnyAction).
 */
import { Pencil, PackageCheck, Ban } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showEdit: boolean
  showComplete: boolean
  showCancel: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
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
