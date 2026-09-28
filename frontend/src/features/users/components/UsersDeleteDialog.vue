<script setup lang="ts">
/**
 * UsersDeleteDialog — soft-delete confirmation for a user. Composes
 * ERPDeleteDialog (foundation); the parent owns the mutation and the `loading`
 * flag and reacts to `confirm` (doc 19 §5, doc 21 §3).
 */
import { computed } from 'vue';
import { ERPDeleteDialog } from '@/components/erp';
import type { User } from '@/types/user';

const props = defineProps<{
  open: boolean;
  user: User | null;
  loading: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void;
  (event: 'confirm'): void;
}>();

const description = computed<string>(() =>
  props.user
    ? `This will deactivate and remove ${props.user.name} (${props.user.email}). This action can be reversed by an administrator.`
    : '',
);
</script>

<template>
  <ERPDeleteDialog
    :open="open"
    title="Delete user"
    :description="description"
    confirm-label="Delete user"
    :loading="loading"
    @update:open="emit('update:open', $event)"
    @confirm="emit('confirm')"
  />
</template>
