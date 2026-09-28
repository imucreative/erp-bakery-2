<script setup lang="ts">
/**
 * RolesView — read-only Roles page. Acts as controller/state manager
 * (doc 19 §2, §6): fetches the role list, owns the selected-role + drawer open
 * state, drives the detail query, and maps values into feature components.
 * No raw HTML controls, tables, or primitives are composed here.
 *
 * Roles are read-only on the backend (GET only) — there are no create/edit/
 * delete affordances by design.
 */
import { computed, ref, watch } from 'vue';
import { ApiClientError } from '@/lib/api';
import { ERPPage, ERPPageHeader, ERPContent, ERPStatusBadge } from '@/components/erp';
import { RolesTable, RolesDetailDrawer } from '@/features/roles/components';
import { useRolesQuery, useRoleDetailQuery } from '@/features/roles/useRoles';
import type { Role } from '@/types/role';

const listQuery = useRolesQuery();

const roles = computed<Role[]>(() => listQuery.data.value ?? []);
const listLoading = computed<boolean>(() => listQuery.isLoading.value);
const listError = computed<string | null>(() => errorMessage(listQuery.error.value));

const drawerOpen = ref<boolean>(false);
const selectedRole = ref<Role | null>(null);

const selectedRoleId = computed<string | null>(() => selectedRole.value?.id ?? null);

const detailQuery = useRoleDetailQuery(selectedRoleId);
const detailLoading = computed<boolean>(() => detailQuery.isLoading.value);
const detailError = computed<string | null>(() => errorMessage(detailQuery.error.value));

function errorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

function onSelectRole(role: Role): void {
  selectedRole.value = role;
  drawerOpen.value = true;
}

// Clear the selection once the drawer fully closes so the detail query can be
// disabled and re-enabled cleanly on the next open.
watch(drawerOpen, (open) => {
  if (!open) {
    selectedRole.value = null;
  }
});
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Roles"
      description="View the roles defined for your company and the permissions each one grants."
    >
      <template #actions>
        <ERPStatusBadge tone="muted" label="Read-only" />
      </template>
    </ERPPageHeader>

    <ERPContent>
      <RolesTable
        :roles="roles"
        :loading="listLoading"
        :error="listError"
        @select="onSelectRole"
      />
    </ERPContent>

    <RolesDetailDrawer
      v-model:open="drawerOpen"
      :role="detailQuery.data.value ?? null"
      :fallback-name="selectedRole?.name ?? 'Role'"
      :loading="detailLoading"
      :error="detailError"
    />
  </ERPPage>
</template>
