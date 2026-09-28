<script setup lang="ts">
/**
 * UsersTable — stateless view renderer for the paginated user list. Composes
 * ERPDataTable + ERPTablePagination + ERPStatusBadge + ERPButton (foundation)
 * and surfaces loading/error/empty states. The list row carries only `roleId`,
 * so the role name is resolved from the `roleNameById` map provided by the view.
 *
 * Row actions (Edit / Delete) render only when `canManage` is true (doc 16 UX
 * gating); the backend guard remains authoritative. No raw table markup or
 * primitives here (doc 19 §5).
 */
import { computed } from 'vue';
import { Pencil, Trash2 } from 'lucide-vue-next';
import {
  ERPDataTable,
  ERPTablePagination,
  ERPStatusBadge,
  ERPButton,
  type ERPTableColumn,
} from '@/components/erp';
import type { User } from '@/types/user';

const props = defineProps<{
  users: User[];
  loading: boolean;
  error: string | null;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Maps roleId → display name for the Role column. */
  roleNameById: Record<string, string>;
  canManage: boolean;
}>();

const emit = defineEmits<{
  (event: 'edit', user: User): void;
  (event: 'delete', user: User): void;
  (event: 'update:page', value: number): void;
  (event: 'update:limit', value: number): void;
}>();

const columns = computed<ERPTableColumn[]>(() => {
  const base: ERPTableColumn[] = [
    { key: 'name', label: 'User' },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone' },
    { key: 'isActive', label: 'Status' },
  ];
  if (props.canManage) {
    base.push({ key: 'actions', label: 'Actions', cellClass: 'text-right' });
  }
  return base;
});

function roleName(user: User): string {
  if (!user.roleId) {
    return '—';
  }
  return props.roleNameById[user.roleId] ?? '—';
}

/** Rows are non-clickable; actions drive edit/delete to avoid accidental opens. */
const hasRows = computed<boolean>(() => props.users.length > 0);
</script>

<template>
  <div class="overflow-hidden rounded-card border border-border bg-surface">
    <ERPDataTable
      :columns="columns"
      :rows="users"
      row-key="id"
      :loading="loading"
      loading-label="Loading users..."
      :error="error"
      empty-title="No users found"
      empty-description="No users match the current filters."
      class="rounded-none border-0"
    >
      <template #cell-name="{ row }">
        <div class="min-w-0">
          <span class="block truncate font-medium text-foreground">{{ row.name }}</span>
          <span class="block truncate text-xs text-muted">{{ row.email }}</span>
        </div>
      </template>

      <template #cell-role="{ row }">
        <span class="text-foreground">{{ roleName(row) }}</span>
      </template>

      <template #cell-phone="{ row }">
        <span class="text-muted">{{ row.phone ?? '—' }}</span>
      </template>

      <template #cell-isActive="{ row }">
        <ERPStatusBadge
          :tone="row.isActive ? 'success' : 'muted'"
          :label="row.isActive ? 'Active' : 'Inactive'"
        />
      </template>

      <template #cell-actions="{ row }">
        <div class="flex items-center justify-end gap-1">
          <ERPButton
            variant="ghost"
            size="sm"
            icon-only
            aria-label="Edit user"
            @click="emit('edit', row)"
          >
            <Pencil class="h-4 w-4" aria-hidden="true" />
          </ERPButton>
          <ERPButton
            variant="ghost"
            size="sm"
            icon-only
            aria-label="Delete user"
            @click="emit('delete', row)"
          >
            <Trash2 class="h-4 w-4 text-danger" aria-hidden="true" />
          </ERPButton>
        </div>
      </template>
    </ERPDataTable>

    <ERPTablePagination
      v-if="hasRows && !loading"
      :page="page"
      :limit="limit"
      :total="total"
      :total-pages="totalPages"
      @update:page="emit('update:page', $event)"
      @update:limit="emit('update:limit', $event)"
    />
  </div>
</template>
