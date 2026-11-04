<template>
  <Modal @close="emit('close')">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 lg:p-11 dark:bg-gray-900"
      >
        <div class="px-2">
          <h4 class="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
            {{ title }}
          </h4>
          <p class="text-muted mb-6 lg:mb-7">{{ description }}</p>
        </div>
        <form class="flex flex-col" @submit.prevent="emit('submit')">
          <div class="grid grid-cols-1 gap-x-6 gap-y-5 px-2 lg:grid-cols-2">
            <slot />
          </div>
          <div class="mt-6 flex items-center gap-3 px-2 lg:justify-end">
            <BaseButton variant="outline" size="sm" type="button" @click="emit('close')">
              Batal
            </BaseButton>
            <BaseButton variant="primary" size="sm" type="submit" :loading="saving">
              Simpan
            </BaseButton>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from './Modal.vue'
import { BaseButton } from '@/components/ui'

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
