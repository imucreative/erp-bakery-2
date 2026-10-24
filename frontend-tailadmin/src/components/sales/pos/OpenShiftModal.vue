<script setup lang="ts">
/**
 * OpenShiftModal — open a new cashier shift: outlet select (from accessible
 * outlets), opening cash, optional notes. Stateless: the parent owns the
 * submitting flag and surfaces backend errors via `errorMessage`, keeping the
 * modal open on failure. Transparent backdrop per UI standard.
 */
import { ref, watch } from 'vue'
import { DoorOpen } from 'lucide-vue-next'
import {
  BaseAlert,
  BaseButton,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTextarea,
} from '@/components/ui'
import type { Outlet } from '@/services/outlet.service'

const props = withDefaults(
  defineProps<{
    open: boolean
    outlets: Outlet[]
    defaultOutletId?: string
    submitting?: boolean
    errorMessage?: string | null
  }>(),
  { defaultOutletId: '', submitting: false, errorMessage: null },
)

const emit = defineEmits<{
  (event: 'close'): void
  (event: 'confirm', payload: { outletId: string; openingCash: number; notes: string }): void
}>()

const outletId = ref<string>('')
const openingCash = ref<number>(0)
const notes = ref<string>('')

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      outletId.value = props.defaultOutletId || props.outlets[0]?.id || ''
      openingCash.value = 0
      notes.value = ''
    }
  },
)

function onConfirm(): void {
  if (!outletId.value) {
    return
  }
  emit('confirm', {
    outletId: outletId.value,
    openingCash: Number(openingCash.value) >= 0 ? Number(openingCash.value) : 0,
    notes: notes.value.trim(),
  })
}
</script>

<template>
  <BaseModal :open="props.open" @close="emit('close')">
    <h4 class="modal-title mb-2">Buka Shift Kasir</h4>
    <p class="text-muted mb-4">Pilih outlet dan masukkan kas awal untuk memulai shift.</p>

    <div class="mb-4">
      <label class="form-label"> Outlet </label>
      <BaseSelect
        id="open-shift-outlet"
        v-model="outletId"
        :options="props.outlets.map((outlet) => ({ label: outlet.name, value: outlet.id }))"
        placeholder="Pilih outlet"
      />
    </div>

    <div class="mb-4">
      <label class="form-label"> Kas Awal (Rp) </label>
      <BaseInput
        id="open-shift-opening-cash"
        :model-value="openingCash"
        type="number"
        min="0"
        step="1000"
        @update:model-value="openingCash = Number($event)"
      />
    </div>

    <div class="mb-4">
      <label class="form-label"> Catatan </label>
      <BaseTextarea
        id="open-shift-notes"
        v-model="notes"
        :rows="2"
        placeholder="Catatan opsional..."
      />
    </div>

    <BaseAlert :message="props.errorMessage" size="sm" class="mb-4" />

    <div class="button-row">
      <BaseButton size="sm" variant="outline" :disabled="props.submitting" @click="emit('close')">
        Batal
      </BaseButton>
      <BaseButton
        size="sm"
        :loading="props.submitting"
        loading-text="Memproses..."
        :disabled="props.submitting || !outletId"
        @click="onConfirm"
      >
        <template #start-icon>
          <DoorOpen class="h-4 w-4" aria-hidden="true" />
        </template>
        Buka Shift
      </BaseButton>
    </div>
  </BaseModal>
</template>
