/**
 * Abstract repository interface — Permissions domain.
 * Permissions are platform-wide (not company-scoped).
 */
export abstract class PermissionRepository {
  /**
   * Fetch all permission IDs for the given permission codes.
   * Used when assigning permissions to a role.
   */
  abstract getIdsByCodes(codes: string[]): Promise<string[]>;

  /**
   * Fetch all permissions (for seeding/admin display).
   */
  abstract getAllPermissions(): Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      domain: string | null;
      moduleKey: string | null;
      moduleName: string | null;
      action: string | null;
      sortOrder: number;
    }>
  >;
}
