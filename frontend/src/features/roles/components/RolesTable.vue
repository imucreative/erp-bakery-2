<script setup lang="ts">
/**
 * RolesTable — stateless view renderer for the role list. Composes
 * ERPDataTable (foundation) and surfaces loading/error/empty states. Rows are
 * clickable and emit `select` with the role so the page can open the detail
 * drawer. No raw HTML table markup or primitives here (doc 19 §5).
 */
import { ERPDataTable, ERPStatusBadge, type ERPTableColumn } from '@/components/erp';
import type { Role } from '@/types/role';

defineProps<{
  roles: Role[];
  loading: boolean;
  error: string | null;
}>();

const emit = defineEmits<{ (event: 'select', role: Role): void }>();

const columns: ERPTableColumn[] = [
  { key: 'name', label: 'Role' },
  { key: 'code', label: 'Code' },
  { key: 'description', label: 'Description' },
  { key: 'isActive', label: 'Status' },
];

function onSelect(role: Role): void {
  emit('select', role);
}
</script>

<template>
  <ERPDataTable
    :columns="columns"
    :rows="roles"
    row-key="id"
    :loading="loading"
    loading-label="Loading roles..."
    :error="error"
    empty-title="No roles found"
    empty-description="There are no roles defined for this company yet."
    row-clickable
    @row-click="onSelect"
  >
    <template #cell-name="{ row }">
      <span class="font-medium text-foreground">{{ row.name }}</span>
    </template>

    <template #cell-code="{ row }">
      <span class="font-mono text-xs text-muted">{{ row.code }}</span>
    </template>

    <template #cell-description="{ row }">
      <span class="text-muted">{{ row.description ?? '—' }}</span>
    </template>

    <template #cell-isActive="{ row }">
      <ERPStatusBadge
        :tone="row.isActive ? 'success' : 'muted'"
        :label="row.isActive ? 'Active' : 'Inactive'"
      />
    </template>
  </ERPDataTable>
</template>
