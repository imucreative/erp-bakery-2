/**
 * Role types — mirror the real backend read contract.
 *
 * Verified against:
 *  - backend/src/Interfaces/http/api/roles/role.controller.ts
 *  - backend/src/Domains/roles/entities/Role.ts
 *
 * Roles are read-only and tenant-scoped:
 *  - GET /api/v1/roles      → { success, data: Role[] }   (NOT paginated)
 *  - GET /api/v1/roles/:id  → { success, data: RoleDetail } (role + permission codes)
 */

/** A role record as serialized by the backend Role entity. */
export interface Role {
  id: string;
  /** NULL for platform-level roles (e.g. SUPER_ADMIN). */
  companyId: string | null;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
}

/** Role detail — a role plus its assigned permission codes. */
export interface RoleDetail extends Role {
  permissions: string[];
}
