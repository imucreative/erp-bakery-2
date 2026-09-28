<script setup lang="ts">
/**
 * UsersFilterBar — stateless filter toolbar for the user list. Composes
 * ERPSearchInput + ERPSelect (foundation) and emits typed filter changes; the
 * view owns the filter state and resets pagination on change (doc 19 §6). No
 * raw controls here (doc 19 §5).
 *
 * The role filter options are provided by the view (from the roles query); the
 * active filter is a fixed tri-state (All / Active / Inactive).
 */
import { computed } from 'vue';
import { ERPSearchInput, ERPSelect, type ERPSelectOption } from '@/components/erp';
import type { Role } from '@/types/role';

const props = defineProps<{
  search: string;
  roleId: string;
  /** '' = all, 'true' = active, 'false' = inactive. */
  isActive: string;
  roles: Role[];
  rolesLoading: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:search', value: string): void;
  (event: 'update:roleId', value: string): void;
  (event: 'update:isActive', value: string): void;
}>();

const roleOptions = computed<ERPSelectOption[]>(() => [
  { value: '', label: 'All roles' },
  ...props.roles.map((role) => ({ value: role.id, label: role.name })),
]);

const statusOptions: ERPSelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
    <div class="sm:w-72">
      <ERPSearchInput
        :model-value="search"
        placeholder="Search by name or email"
        @update:model-value="emit('update:search', $event)"
      />
    </div>
    <div class="sm:w-52">
      <ERPSelect
        :model-value="roleId"
        :options="roleOptions"
        placeholder="All roles"
        :disabled="rolesLoading"
        @update:model-value="emit('update:roleId', $event)"
      />
    </div>
    <div class="sm:w-44">
      <ERPSelect
        :model-value="isActive"
        :options="statusOptions"
        placeholder="All statuses"
        @update:model-value="emit('update:isActive', $event)"
      />
    </div>
  </div>
</template>
