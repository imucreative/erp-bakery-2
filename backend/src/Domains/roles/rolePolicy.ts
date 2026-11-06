/**
 * Role policy shared by tenant and platform role management.
 *
 * System-administration permissions are platform-only concerns (doc 16):
 * SUPER_ADMIN manages users, roles, permissions, audit, and auth. They must
 * never be granted to a company-scoped role, otherwise a tenant could escalate
 * into platform administration.
 */
export const RESERVED_PERMISSION_CODES = [
  'user.read',
  'user.manage',
  'role.read',
  'role.manage',
  'permission.read',
  'permission.manage',
  'audit.read',
  'auth.manage',
] as const;

const RESERVED_SET = new Set<string>(RESERVED_PERMISSION_CODES);

/** Returns the requested codes that are reserved for platform administration. */
export function findReservedPermissions(codes: string[]): string[] {
  return codes.filter((code) => RESERVED_SET.has(code));
}
