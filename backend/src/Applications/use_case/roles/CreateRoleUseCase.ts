import { RoleRepository } from '../../../Domains/roles/RoleRepository';
import { PermissionRepository } from '../../../Domains/permissions/PermissionRepository';
import { Role } from '../../../Domains/roles/entities/Role';

const OWNER_ROLE_CODE = 'OWNER';
const ROLE_MANAGE_PERMISSION = 'role.manage';

export interface CreateRolePayload {
  code: string;
  name: string;
  description?: string | null;
  permissions: string[];
}

/**
 * UseCase: CreateRoleUseCase
 *
 * 1. Validate & normalise the payload (code trim + uppercase, non-empty name).
 * 2. Validate every requested permission code exists in the global catalog
 *    (no privilege escalation — reject unknown codes → ROLE.PERMISSION_UNKNOWN).
 * 3. Enforce the OWNER guardrail: an OWNER role always keeps `role.manage`.
 * 4. Create the role scoped to the company, then assign its permission set.
 *
 * `code` uniqueness per company is enforced by the DB unique constraint
 * (roles_code_company_unique) → mapped to ROLE.CODE_ALREADY_USED.
 */
export class CreateRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<Role & { permissions: string[] }> {
    const { code, name, description, permissions } = this._validatePayload(payload);

    await this._verifyPermissionsExist(permissions);

    const effectivePermissions = this._enforceOwnerGuardrail(code, permissions);

    let roleId: string;
    try {
      roleId = await this.roleRepository.addRole({
        companyId,
        code,
        name,
        description: description ?? null,
      });
    } catch (err) {
      if (this._isUniqueViolation(err)) {
        throw new Error('ROLE.CODE_ALREADY_USED');
      }
      throw err;
    }

    await this.roleRepository.setRolePermissions(roleId, effectivePermissions);

    const role = await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);
    const assigned = await this.roleRepository.getRolePermissions(roleId);

    return Object.assign(role, { permissions: assigned });
  }

  private _validatePayload(payload: unknown): CreateRolePayload {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('CREATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    const { code, name, description, permissions } = payload as Record<string, unknown>;

    if (code === undefined || name === undefined || permissions === undefined) {
      throw new Error('CREATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    if (typeof code !== 'string' || typeof name !== 'string' || !Array.isArray(permissions)) {
      throw new Error('CREATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (description !== undefined && description !== null && typeof description !== 'string') {
      throw new Error('CREATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    if (!permissions.every((p) => typeof p === 'string')) {
      throw new Error('CREATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    const normalizedCode = code.trim().toUpperCase();
    const normalizedName = name.trim();

    if (normalizedCode.length === 0 || normalizedCode.length > 50) {
      throw new Error('CREATE_ROLE.CODE_LIMIT_CHAR');
    }
    if (normalizedName.length === 0 || normalizedName.length > 100) {
      throw new Error('CREATE_ROLE.NAME_LIMIT_CHAR');
    }

    // De-duplicate permission codes.
    const uniquePermissions = Array.from(new Set(permissions as string[]));

    return {
      code: normalizedCode,
      name: normalizedName,
      description:
        description === undefined || description === null ? null : (description as string).trim(),
      permissions: uniquePermissions,
    };
  }

  private async _verifyPermissionsExist(permissionCodes: string[]): Promise<void> {
    if (permissionCodes.length === 0) return;

    const foundIds = await this.permissionRepository.getIdsByCodes(permissionCodes);
    if (foundIds.length !== permissionCodes.length) {
      throw new Error('ROLE.PERMISSION_UNKNOWN');
    }
  }

  private _enforceOwnerGuardrail(code: string, permissions: string[]): string[] {
    if (code === OWNER_ROLE_CODE && !permissions.includes(ROLE_MANAGE_PERMISSION)) {
      return [...permissions, ROLE_MANAGE_PERMISSION];
    }
    return permissions;
  }

  private _isUniqueViolation(err: unknown): boolean {
    return (
      !!err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}
