/**
 * Roles query hooks (TanStack Query for Vue). Read-only module.
 *
 * Query keys are structured so caches invalidate/scope cleanly and so future
 * modules can reuse this pattern:
 *  - ['roles', 'list']         → the company role list
 *  - ['roles', 'detail', id]   → a single role with its permissions
 *
 * `staleTime` is generous here because roles change rarely (seed-controlled per
 * doc 16 §5), reducing redundant refetches.
 */

import { computed, unref, type MaybeRefOrGetter } from 'vue';
import { useQuery } from '@tanstack/vue-query';
import { roleService } from '@/services/role.service';
import type { Role, RoleDetail } from '@/types/role';

const ROLES_STALE_TIME_MS = 5 * 60 * 1000;

export const roleKeys = {
  all: ['roles'] as const,
  list: () => [...roleKeys.all, 'list'] as const,
  detail: (id: string) => [...roleKeys.all, 'detail', id] as const,
};

/** Fetches the company role list. */
export function useRolesQuery() {
  return useQuery<Role[]>({
    queryKey: roleKeys.list(),
    queryFn: () => roleService.list(),
    staleTime: ROLES_STALE_TIME_MS,
  });
}

/**
 * Fetches a single role's detail (including permission codes). Accepts a
 * reactive/nullable id; the query is disabled until an id is provided so it can
 * back a lazily-opened detail drawer.
 */
export function useRoleDetailQuery(id: MaybeRefOrGetter<string | null>) {
  const resolvedId = computed<string | null>(() => {
    const value = typeof id === 'function' ? id() : unref(id);
    return value ?? null;
  });

  return useQuery<RoleDetail>({
    queryKey: computed(() => roleKeys.detail(resolvedId.value ?? 'none')),
    queryFn: () => roleService.getById(resolvedId.value as string),
    enabled: computed<boolean>(() => resolvedId.value !== null),
    staleTime: ROLES_STALE_TIME_MS,
  });
}
