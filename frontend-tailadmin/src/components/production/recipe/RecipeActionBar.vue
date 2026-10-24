<script setup lang="ts">
import { Pencil, CheckCircle2, Archive, Trash2, Copy } from 'lucide-vue-next'
import { BaseButton } from '@/components/ui'

const props = defineProps<{
  showEdit: boolean
  showActivate: boolean
  showArchive: boolean
  showDelete: boolean
  showDuplicate: boolean
  submitting: boolean
}>()

const emit = defineEmits<{
  (e: 'edit'): void
  (e: 'activate'): void
  (e: 'archive'): void
  (e: 'delete'): void
  (e: 'duplicate'): void
}>()
</script>

<template>
  <div class="flex flex-wrap items-center justify-end gap-3">
    <BaseButton v-if="props.showEdit" variant="outline" @click="emit('edit')">
      <template #start-icon><Pencil class="h-4 w-4" aria-hidden="true" /></template>Edit
    </BaseButton>
    <BaseButton
      v-if="props.showActivate"
      variant="success"
      :disabled="props.submitting"
      @click="emit('activate')"
    >
      <template #start-icon><CheckCircle2 class="h-4 w-4" aria-hidden="true" /></template>Aktifkan
    </BaseButton>
    <BaseButton
      v-if="props.showArchive"
      variant="warning"
      :disabled="props.submitting"
      @click="emit('archive')"
    >
      <template #start-icon><Archive class="h-4 w-4" aria-hidden="true" /></template>Arsipkan
    </BaseButton>
    <BaseButton
      v-if="props.showDuplicate"
      variant="outline"
      :disabled="props.submitting"
      @click="emit('duplicate')"
    >
      <template #start-icon><Copy class="h-4 w-4" aria-hidden="true" /></template>Duplikat ke Draft
    </BaseButton>
    <BaseButton
      v-if="props.showDelete"
      variant="danger"
      :disabled="props.submitting"
      @click="emit('delete')"
    >
      <template #start-icon><Trash2 class="h-4 w-4" aria-hidden="true" /></template>Hapus
    </BaseButton>
  </div>
</template>
