import { RoleRepository } from '../../../Domains/roles/RoleRepository';
import { PermissionRepository } from '../../../Domains/permissions/PermissionRepository';
import { Role } from '../../../Domains/roles/entities/Role';
import { findReservedPermissions } from '../../../Domains/roles/rolePolicy';

export interface UpdateRolePayload {
  name?: string;
  description?: string | null;
  permissions?: string[];
}

/**
 * UseCase: UpdateRoleUseCase
 *
 * 1. Verify the role exists within the company (tenant isolation). Platform
 *    roles (company_id NULL) are excluded by getRoleByIdAndCompany.
 * 2. Validate the partial payload. `code` is immutable and is never read.
 * 3. If `permissions` is provided → FULL-SYNC the permission set:
 *    - validate every code exists in the global catalog (no escalation),
 *    - reject system-administration permissions (ROLE.PERMISSION_RESERVED).
 * 4. Apply name/description update and permission sync in one transaction.
 */
export class UpdateRoleUseCase {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
  ): Promise<Role & { permissions: string[] }> {
    // Existence + tenant check (throws ROLE.NOT_FOUND). Also gives us the code
    // for the OWNER guardrail — the client never controls `code` on update.
    // Existence + tenant check (throws ROLE.NOT_FOUND).
    await this.roleRepository.getRoleByIdAndCompany(id, companyId);

    const { name, description, permissions } = this._validatePayload(payload);

    if (permissions !== undefined) {
      await this._verifyPermissionsExist(permissions);
      this._rejectReserved(permissions);
    }

    const data: { name?: string; description?: string | null } = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;

    await this.roleRepository.updateRoleWithPermissions(id, companyId, data, permissions);

    const role = await this.roleRepository.getRoleByIdAndCompany(id, companyId);
    const assigned = await this.roleRepository.getRolePermissions(id);

    return Object.assign(role, { permissions: assigned });
  }

  private _validatePayload(payload: unknown): UpdateRolePayload {
    if (typeof payload !== 'object' || payload === null) {
      throw new Error('UPDATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
    }

    const { name, description, permissions } = payload as Record<string, unknown>;

    const result: UpdateRolePayload = {};

    if (name !== undefined) {
      if (typeof name !== 'string') {
        throw new Error('UPDATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      const normalized = name.trim();
      if (normalized.length === 0 || normalized.length > 100) {
        throw new Error('UPDATE_ROLE.NAME_LIMIT_CHAR');
      }
      result.name = normalized;
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        throw new Error('UPDATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      result.description = description === null ? null : (description as string).trim();
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions) || !permissions.every((p) => typeof p === 'string')) {
        throw new Error('UPDATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
      }
      result.permissions = Array.from(new Set(permissions as string[]));
    }

    if (
      result.name === undefined &&
      result.description === undefined &&
      result.permissions === undefined
    ) {
      throw new Error('UPDATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY');
    }

    return result;
  }

  private async _verifyPermissionsExist(permissionCodes: string[]): Promise<void> {
    if (permissionCodes.length === 0) return;

    const foundIds = await this.permissionRepository.getIdsByCodes(permissionCodes);
    if (foundIds.length !== permissionCodes.length) {
      throw new Error('ROLE.PERMISSION_UNKNOWN');
    }
  }

  private _rejectReserved(permissionCodes: string[]): void {
    if (findReservedPermissions(permissionCodes).length > 0) {
      throw new Error('ROLE.PERMISSION_RESERVED');
    }
  }
}
