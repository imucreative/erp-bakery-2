import { Role } from './entities/Role';

export interface CreateRoleData {
  companyId: string | null;
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateRoleData {
  name?: string;
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
   * Fetch role by id scoped to a company (tenant isolation).
   * Throws ROLE.NOT_FOUND if missing or owned by another company.
   */
  abstract getRoleByIdAndCompany(id: string, companyId: string): Promise<Role>;

  /**
   * Fetch the permission codes assigned to a role.
   */
  abstract getRolePermissions(roleId: string): Promise<string[]>;

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

  /**
   * Update a role's editable attributes (name / description) scoped to a
   * company (tenant isolation). `code` is immutable and is never updated here.
   * Throws ROLE.NOT_FOUND if missing or owned by another company (or platform).
   */
  abstract updateRole(
    id: string,
    companyId: string,
    data: UpdateRoleData,
  ): Promise<Role>;

  /**
   * Full-sync the permission set of a role: removes permissions that are no
   * longer present and inserts the new ones, in a single transaction.
   * Resolves permission codes → IDs; unknown codes are ignored here (the
   * use-case is responsible for validating the catalog beforehand).
   */
  abstract setRolePermissions(
    roleId: string,
    permissionCodes: string[],
  ): Promise<void>;

  /**
   * Hard-delete a role scoped to a company (tenant isolation). Associated
   * role_permissions rows are removed by ON DELETE CASCADE.
   * Throws ROLE.NOT_FOUND if missing or owned by another company (or platform).
   */
  abstract deleteRole(id: string, companyId: string): Promise<void>;

  /**
   * Count active (non-deleted) users currently assigned to a role within a
   * company. Used to enforce delete-in-use dependency protection.
   */
  abstract countUsersUsingRole(
    roleId: string,
    companyId: string,
  ): Promise<number>;
}
