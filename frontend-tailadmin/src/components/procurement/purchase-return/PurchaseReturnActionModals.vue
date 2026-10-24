<script setup lang="ts">
/**
 * PurchaseReturnActionModals — a single confirmation modal driven by `action`
 * ('submit' | 'complete' | 'cancel' | null). All three expose an optional note.
 * Complete explicitly warns the user that it posts the inventory RETURN
 * reversal and cannot be undone. The parent runs the mutation and surfaces
 * backend errors via `errorMessage`, keeping the user on the page. The shell is
 * `BaseModal` (transparent blurred backdrop, Esc + backdrop click close).
 */
import { computed, ref, watch } from 'vue'
import { TriangleAlert } from 'lucide-vue-next'
import { BaseAlert, BaseButton, BaseModal, BaseTextarea } from '@/components/ui'

export type PurchaseReturnAction = 'submit' | 'complete' | 'cancel'

const props = withDefaults(
  defineProps<{
    action: PurchaseReturnAction | null
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', note: string): void
}>()

const note = ref<string>('')

watch(
  () => props.action,
  (next) => {
    if (next) {
      note.value = ''
    }
  },
)

const isComplete = computed<boolean>(() => props.action === 'complete')

const title = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan Purchase Return'
    case 'complete':
      return 'Selesaikan Purchase Return'
    case 'cancel':
      return 'Batalkan Purchase Return'
    default:
      return ''
  }
})

const description = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan retur ini untuk diproses. Setelah diajukan, retur tidak dapat diedit. Catatan opsional.'
    case 'complete':
      return 'Menyelesaikan retur ini akan memposting pengembalian stok (reversal) ke inventory. Tindakan ini bersifat final dan tidak dapat dibatalkan. Catatan opsional.'
    case 'cancel':
      return 'Batalkan retur ini? Tindakan ini bersifat final. Catatan opsional.'
    default:
      return ''
  }
})

const confirmLabel = computed<string>(() => {
  switch (props.action) {
    case 'submit':
      return 'Ajukan Retur'
    case 'complete':
      return 'Selesaikan & Posting Reversal'
    case 'cancel':
      return 'Batalkan Retur'
    default:
      return 'Konfirmasi'
  }
})

function onConfirm(): void {
  emit('confirm', note.value.trim())
}
</script>

<template>
  <BaseModal :open="Boolean(action)" @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-4">{{ description }}</p>

    <BaseAlert v-if="isComplete" variant="warning" size="sm" class="mb-4 dark:text-orange-400">
      <span class="flex items-start gap-2">
        <TriangleAlert class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Setelah selesai, retur tidak bisa diedit atau dibatalkan.</span>
      </span>
    </BaseAlert>

    <div class="mb-4">
      <label class="form-label"> Catatan </label>
      <BaseTextarea
        id="purchase-return-action-note"
        :model-value="note"
        :rows="3"
        placeholder="Catatan opsional..."
        @update:model-value="note = $event"
      />
    </div>

    <BaseAlert :message="errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="submitting" @click="emit('close')">
        Batal
      </BaseButton>
      <BaseButton
        type="button"
        :variant="action === 'submit' ? 'primary' : action === 'complete' ? 'success' : 'danger'"
        :loading="submitting"
        loading-text="Memproses..."
        @click="onConfirm"
      >
        {{ confirmLabel }}
      </BaseButton>
    </div>
  </BaseModal>
</template>
