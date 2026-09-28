/**
 * Users query + mutation hooks (TanStack Query for Vue). Full-CRUD module.
 *
 * Query keys (doc 37):
 *  - ['users', 'list', params]  → the paginated, filtered user list
 *  - ['users', 'detail', id]    → a single user with role + outlets
 *  - ['outlets', 'options']     → active outlets for the assignment dropdown
 *
 * Mutations invalidate the list (and the affected detail) on success, surface
 * a success toast, and re-throw so the calling form can surface the backend
 * error message and keep the user on the current form/document state
 * (doc 21 §3, doc 37). Error toasts are raised here from the normalized
 * ApiClientError message.
 */

import { computed, unref, type MaybeRefOrGetter } from 'vue';
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/vue-query';
import { userService, type UserListResult } from '@/services/user.service';
import { outletService } from '@/services/outlet.service';
import { useNotificationStore } from '@/stores/notification';
import { ApiClientError } from '@/lib/api';
import type { Outlet } from '@/types/outlet';
import type {
  CreatedUser,
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserDetail,
  UserListParams,
} from '@/types/user';

const USERS_STALE_TIME_MS = 30 * 1000;
const OUTLET_OPTIONS_STALE_TIME_MS = 5 * 60 * 1000;
// Outlets for the dropdown: fetch a generous page so a company's outlets fit in
// one request. The list endpoint caps `limit` at 100 (user-query DTO parity).
const OUTLET_OPTIONS_LIMIT = 100;

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserListParams) => [...userKeys.lists(), params] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

export const outletKeys = {
  all: ['outlets'] as const,
  options: () => [...outletKeys.all, 'options'] as const,
};

/** Extracts a user-facing message from an unknown error. */
function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

/**
 * Fetches the paginated user list. Accepts a reactive params getter so the
 * query refetches whenever filters/pagination change.
 */
export function useUsersQuery(params: MaybeRefOrGetter<UserListParams>) {
  const resolvedParams = computed<UserListParams>(() =>
    typeof params === 'function' ? params() : unref(params),
  );

  return useQuery<UserListResult>({
    queryKey: computed(() => userKeys.list(resolvedParams.value)),
    queryFn: () => userService.list(resolvedParams.value),
    staleTime: USERS_STALE_TIME_MS,
  });
}

/**
 * Fetches a single user's detail (role + outlets). Accepts a reactive/nullable
 * id; disabled until an id is provided so it can back a lazily-opened edit
 * dialog.
 */
export function useUserDetailQuery(id: MaybeRefOrGetter<string | null>) {
  const resolvedId = computed<string | null>(() => {
    const value = typeof id === 'function' ? id() : unref(id);
    return value ?? null;
  });

  return useQuery<UserDetail>({
    queryKey: computed(() => userKeys.detail(resolvedId.value ?? 'none')),
    queryFn: () => userService.getById(resolvedId.value as string),
    enabled: computed<boolean>(() => resolvedId.value !== null),
    staleTime: USERS_STALE_TIME_MS,
  });
}

/**
 * Fetches active outlets for the assignment dropdown. Only active outlets are
 * offered for new assignments; historical (inactive) assignments still render
 * from the user detail itself.
 */
export function useOutletOptionsQuery(enabled: MaybeRefOrGetter<boolean> = true) {
  const isEnabled = computed<boolean>(() =>
    typeof enabled === 'function' ? enabled() : unref(enabled),
  );

  return useQuery<Outlet[]>({
    queryKey: outletKeys.options(),
    queryFn: async () => {
      const result = await outletService.list({
        page: 1,
        limit: OUTLET_OPTIONS_LIMIT,
        isActive: 'true',
      });
      return result.items;
    },
    enabled: isEnabled,
    staleTime: OUTLET_OPTIONS_STALE_TIME_MS,
  });
}

/** Create-user mutation. Invalidates the user list on success. */
export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();

  return useMutation<CreatedUser, unknown, CreateUserPayload>({
    mutationFn: (payload) => userService.create(payload),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      notify.notifySuccess('User created', `${created.name} has been added.`);
    },
    onError: (error) => {
      notify.notifyError('Failed to create user', toErrorMessage(error));
    },
  });
}

/** Update-user mutation. Invalidates the list and the affected detail. */
export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();

  return useMutation<User, unknown, { id: string; payload: UpdateUserPayload }>({
    mutationFn: ({ id, payload }) => userService.update(id, payload),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      void queryClient.invalidateQueries({ queryKey: userKeys.detail(updated.id) });
      notify.notifySuccess('User updated', `${updated.name} has been saved.`);
    },
    onError: (error) => {
      notify.notifyError('Failed to update user', toErrorMessage(error));
    },
  });
}

/** Soft-delete mutation. Invalidates the user list on success. */
export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  const notify = useNotificationStore();

  return useMutation<void, unknown, { id: string; name: string }>({
    mutationFn: ({ id }) => userService.remove(id),
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      notify.notifySuccess('User deleted', `${variables.name} has been removed.`);
    },
    onError: (error) => {
      notify.notifyError('Failed to delete user', toErrorMessage(error));
    },
  });
}
