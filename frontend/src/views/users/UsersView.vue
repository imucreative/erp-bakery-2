<script setup lang="ts">
/**
 * UsersView — full-CRUD Users page. Acts as controller/state manager
 * (doc 19 §2, §6): owns filters + pagination, dialog open/mode/selected state,
 * drives the list/detail/roles/outlet queries, and wires the create/update/
 * delete mutations. It composes only feature components + container foundation
 * (ERPPage/ERPContent/ERPButton); no raw HTML controls or primitives here.
 *
 * Create/Edit/Delete affordances render only when the user holds `user.manage`
 * (doc 16 UX gating). The backend guards remain authoritative.
 */
import { computed, reactive, ref, watch } from 'vue';
import { UserPlus } from 'lucide-vue-next';
import { ApiClientError } from '@/lib/api';
import { ERPPage, ERPPageHeader, ERPContent, ERPButton } from '@/components/erp';
import { usePermission } from '@/composables/usePermission';
import { useRolesQuery } from '@/features/roles/useRoles';
import {
  UsersTable,
  UsersFilterBar,
  UsersFormDialog,
  UsersDeleteDialog,
} from '@/features/users/components';
import {
  useUsersQuery,
  useUserDetailQuery,
  useOutletOptionsQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from '@/features/users/useUsers';
import type { Role } from '@/types/role';
import type { Outlet } from '@/types/outlet';
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserListParams,
} from '@/types/user';

const { can } = usePermission();
const canManage = computed<boolean>(() => can('user.manage'));

const DEFAULT_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

// ── Filters + pagination ─────────────────────────────────────────────
const filters = reactive<{ search: string; roleId: string; isActive: string }>({
  search: '',
  roleId: '',
  isActive: '',
});

// Debounced search term feeds the query; the raw term drives the input.
const debouncedSearch = ref<string>('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const page = ref<number>(1);
const limit = ref<number>(DEFAULT_LIMIT);

watch(
  () => filters.search,
  (value) => {
    if (searchTimer) {
      clearTimeout(searchTimer);
    }
    searchTimer = setTimeout(() => {
      debouncedSearch.value = value.trim();
      page.value = 1;
    }, SEARCH_DEBOUNCE_MS);
  },
);

// Non-search filters reset pagination immediately.
watch(
  () => [filters.roleId, filters.isActive],
  () => {
    page.value = 1;
  },
);

const listParams = computed<UserListParams>(() => ({
  page: page.value,
  limit: limit.value,
  search: debouncedSearch.value || undefined,
  roleId: filters.roleId || undefined,
  isActive:
    filters.isActive === 'true'
      ? 'true'
      : filters.isActive === 'false'
        ? 'false'
        : undefined,
}));

// ── Queries ──────────────────────────────────────────────────────────
const rolesQuery = useRolesQuery();
const roles = computed<Role[]>(() => rolesQuery.data.value ?? []);
const rolesLoading = computed<boolean>(() => rolesQuery.isLoading.value);
const roleNameById = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {};
  for (const role of roles.value) {
    map[role.id] = role.name;
  }
  return map;
});

// Outlet options only need to load once the manage-capable user opens a dialog.
const outletOptionsEnabled = ref<boolean>(false);
const outletsQuery = useOutletOptionsQuery(outletOptionsEnabled);
const outlets = computed<Outlet[]>(() => outletsQuery.data.value ?? []);

const listQuery = useUsersQuery(listParams);
const users = computed<User[]>(() => listQuery.data.value?.items ?? []);
const listLoading = computed<boolean>(() => listQuery.isLoading.value);
const listError = computed<string | null>(() => errorMessage(listQuery.error.value));
const total = computed<number>(() => listQuery.data.value?.meta.total ?? 0);
const totalPages = computed<number>(() => listQuery.data.value?.meta.totalPages ?? 0);

// ── Dialog state ─────────────────────────────────────────────────────
const formOpen = ref<boolean>(false);
const formMode = ref<'create' | 'edit'>('create');
const editingUserId = ref<string | null>(null);

const detailQuery = useUserDetailQuery(editingUserId);
const detailLoading = computed<boolean>(() => detailQuery.isLoading.value);

const deleteOpen = ref<boolean>(false);
const deleteTarget = ref<User | null>(null);

// ── Mutations ────────────────────────────────────────────────────────
const createMutation = useCreateUserMutation();
const updateMutation = useUpdateUserMutation();
const deleteMutation = useDeleteUserMutation();

const submitting = computed<boolean>(
  () => createMutation.isPending.value || updateMutation.isPending.value,
);
const deleting = computed<boolean>(() => deleteMutation.isPending.value);

function errorMessage(error: unknown): string | null {
  if (!error) {
    return null;
  }
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

// ── Handlers ─────────────────────────────────────────────────────────
function openCreate(): void {
  outletOptionsEnabled.value = true;
  editingUserId.value = null;
  formMode.value = 'create';
  formOpen.value = true;
}

function openEdit(user: User): void {
  outletOptionsEnabled.value = true;
  editingUserId.value = user.id;
  formMode.value = 'edit';
  formOpen.value = true;
}

function openDelete(user: User): void {
  deleteTarget.value = user;
  deleteOpen.value = true;
}

async function onCreate(payload: CreateUserPayload): Promise<void> {
  try {
    await createMutation.mutateAsync(payload);
    formOpen.value = false;
  } catch {
    // Error toast is raised in the mutation; keep the dialog open so the user
    // retains their input (doc 21 §3).
  }
}

async function onEdit(payload: UpdateUserPayload): Promise<void> {
  if (!editingUserId.value) {
    return;
  }
  try {
    await updateMutation.mutateAsync({ id: editingUserId.value, payload });
    formOpen.value = false;
  } catch {
    // Keep the dialog open on failure (doc 21 §3).
  }
}

async function onConfirmDelete(): Promise<void> {
  if (!deleteTarget.value) {
    return;
  }
  try {
    await deleteMutation.mutateAsync({
      id: deleteTarget.value.id,
      name: deleteTarget.value.name,
    });
    deleteOpen.value = false;
  } catch {
    // Keep the dialog open on failure; the error toast explains why.
  }
}

// Clear the selected detail once the form fully closes so the detail query can
// be disabled and re-enabled cleanly on the next open.
watch(formOpen, (open) => {
  if (!open) {
    editingUserId.value = null;
  }
});

watch(deleteOpen, (open) => {
  if (!open) {
    deleteTarget.value = null;
  }
});
</script>

<template>
  <ERPPage>
    <ERPPageHeader
      title="Users"
      description="Manage the people in your company, their roles, and outlet access."
    >
      <template v-if="canManage" #actions>
        <ERPButton @click="openCreate">
          <UserPlus class="h-4 w-4" aria-hidden="true" />
          Add user
        </ERPButton>
      </template>
    </ERPPageHeader>

    <ERPContent>
      <div class="space-y-4">
        <UsersFilterBar
          v-model:search="filters.search"
          v-model:role-id="filters.roleId"
          v-model:is-active="filters.isActive"
          :roles="roles"
          :roles-loading="rolesLoading"
        />

        <UsersTable
          :users="users"
          :loading="listLoading"
          :error="listError"
          :page="page"
          :limit="limit"
          :total="total"
          :total-pages="totalPages"
          :role-name-by-id="roleNameById"
          :can-manage="canManage"
          @edit="openEdit"
          @delete="openDelete"
          @update:page="page = $event"
          @update:limit="
            (value) => {
              limit = value;
              page = 1;
            }
          "
        />
      </div>
    </ERPContent>

    <UsersFormDialog
      v-if="canManage"
      v-model:open="formOpen"
      :mode="formMode"
      :user="detailQuery.data.value ?? null"
      :detail-loading="detailLoading"
      :roles="roles"
      :outlets="outlets"
      :submitting="submitting"
      @submit-create="onCreate"
      @submit-edit="onEdit"
    />

    <UsersDeleteDialog
      v-if="canManage"
      v-model:open="deleteOpen"
      :user="deleteTarget"
      :loading="deleting"
      @confirm="onConfirmDelete"
    />
  </ERPPage>
</template>
