/**
 * Permission composable — client-side UX gating aligned with doc 16.
 *
 * Rules:
 *  - `isSuperAdmin` bypasses all checks.
 *  - A `<module>.manage` permission implies `<module>.read` (doc 16 §6).
 *  - Otherwise an exact permission string must be present.
 *
 * The backend TenantContext remains authoritative; this only drives UI
 * visibility (nav items, action buttons, route guards).
 */

import { computed } from 'vue';
import { useAuthStore } from '@/stores/auth';

const READ_SUFFIX = '.read';
const MANAGE_SUFFIX = '.manage';

export function hasPermission(
  permissions: string[],
  isSuperAdmin: boolean,
  required: string,
): boolean {
  if (isSuperAdmin) {
    return true;
  }
  if (permissions.includes(required)) {
    return true;
  }
  // `<module>.manage` implies `<module>.read`.
  if (required.endsWith(READ_SUFFIX)) {
    const managePermission =
      required.slice(0, -READ_SUFFIX.length) + MANAGE_SUFFIX;
    return permissions.includes(managePermission);
  }
  return false;
}

export function usePermission() {
  const auth = useAuthStore();

  const can = (required: string): boolean =>
    hasPermission(auth.permissions, auth.isSuperAdmin, required);

  const canAny = (required: string[]): boolean =>
    required.some((permission) => can(permission));

  const canAll = (required: string[]): boolean =>
    required.every((permission) => can(permission));

  return {
    can,
    canAny,
    canAll,
    isSuperAdmin: computed<boolean>(() => auth.isSuperAdmin),
  };
}
