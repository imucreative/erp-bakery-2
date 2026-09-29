/**
 * Permission helper backed by the auth store (decoded from the JWT).
 * Mirrors the backend rule (doc 16): `<module>.manage` implies `<module>.read`,
 * and a super admin passes every check.
 */

import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

/** Pure check usable outside setup (e.g. router guards). */
export function hasPermission(
  permissions: string[],
  isSuperAdmin: boolean,
  required: string,
): boolean {
  if (isSuperAdmin) {
    return true
  }
  if (permissions.includes(required)) {
    return true
  }
  // `.manage` implies `.read` for the same module.
  if (required.endsWith('.read')) {
    const manage = required.slice(0, -'.read'.length) + '.manage'
    if (permissions.includes(manage)) {
      return true
    }
  }
  return false
}

export function usePermission() {
  const auth = useAuthStore()

  const can = (required: string): boolean =>
    hasPermission(auth.permissions, auth.isSuperAdmin, required)

  const canAny = (required: string[]): boolean => required.some((p) => can(p))

  return { can, canAny }
}
