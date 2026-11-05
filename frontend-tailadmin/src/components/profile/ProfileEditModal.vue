<template>
  <BaseModal :open="true" size="2xl" scrollable @close="emit('close')">
    <h4 class="modal-title mb-2">{{ title }}</h4>
    <p class="text-muted mb-6 lg:mb-7">{{ description }}</p>

    <form class="flex flex-col" @submit.prevent="emit('submit')">
      <div class="field-grid gap-x-6 gap-y-5 lg:grid-cols-2">
        <slot />
      </div>
      <div class="button-row mt-6">
        <BaseButton variant="outline" size="sm" type="button" @click="emit('close')">
          <X class="size-5" />
          Batal
        </BaseButton>
        <BaseButton
          variant="success"
          size="sm"
          type="submit"
          :loading="saving"
          :disabled="!canSubmit"
        >
          <Save class="size-5" />
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from '@/components/ui'
import { Save, X } from 'lucide-vue-next';

/** Shared modal shell for the profile edit forms (title, actions, layout). */
withDefaults(
  defineProps<{
    title: string
    description: string
    saving?: boolean
    /** false = tombol Simpan dinonaktifkan (form belum valid). */
    canSubmit?: boolean
  }>(),
  { saving: false, canSubmit: true },
)

const emit = defineEmits<{
  close: []
  submit: []
}>()
</script>
