import { Role } from './entities/Role';

export interface CreateRoleData {
  companyId: string | null;
  code: string;
  name: string;
  description?: string | null;
}

/**
 * Abstract repository interface — Roles domain.
 */
export abstract class RoleRepository {
  /**
   * Persist a new role and return its ID.
   */
  abstract addRole(data: CreateRoleData): Promise<string>;

  /**
   * Fetch role by id. Throws ROLE.NOT_FOUND if missing.
   */
  abstract getRoleById(id: string): Promise<Role>;

  /**
   * Fetch role by code within a company scope.
   * Throws ROLE.NOT_FOUND if missing.
   */
  abstract getRoleByCode(code: string, companyId: string | null): Promise<Role>;

  /**
   * Assign a list of permission codes to a role.
   * Resolves permission codes → IDs then inserts into role_permissions.
   * Idempotent — uses INSERT ... ON CONFLICT DO NOTHING.
   */
  abstract assignPermissionsToRole(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void>;

  /**
   * Assign all existing permissions to a role (used for OWNER role).
   */
  abstract assignAllPermissionsToRole(roleId: string): Promise<void>;

  /**
   * List all roles for a company.
   */
  abstract getRolesByCompanyId(companyId: string): Promise<Role[]>;
}
