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
          Batal
        </BaseButton>
        <BaseButton variant="primary" size="sm" type="submit" :loading="saving">
          Simpan
        </BaseButton>
      </div>
    </form>
  </BaseModal>
</template>

<script setup lang="ts">
import { BaseButton, BaseModal } from '@/components/ui'

/** Shared modal shell for the profile edit forms (title, actions, layout). */
defineProps<{
  title: string
  description: string
  saving?: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: []
}>()
</script>
