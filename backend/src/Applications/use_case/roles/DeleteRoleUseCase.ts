import { RoleRepository } from '../../../Domains/roles/RoleRepository';

const OWNER_ROLE_CODE = 'OWNER';

/**
 * UseCase: DeleteRoleUseCase
 *
 * Hard-deletes a company role, enforcing the ADR 49 guardrails:
 * 1. Existence + tenant check (throws ROLE.NOT_FOUND). Platform roles
 *    (company_id NULL) are never reachable here.
 * 2. The OWNER role can never be deleted → ROLE.OWNER_CANNOT_BE_DELETED.
 * 3. Dependency protection (doc 44): a role still assigned to any active user
 *    cannot be deleted → ROLE.IN_USE (409).
 *
 * role_permissions rows are removed by ON DELETE CASCADE.
 */
export class DeleteRoleUseCase {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    const role = await this.roleRepository.getRoleByIdAndCompany(id, companyId);

    if (role.code === OWNER_ROLE_CODE) {
      throw new Error('ROLE.OWNER_CANNOT_BE_DELETED');
    }

    const activeUsers = await this.roleRepository.countUsersUsingRole(id, companyId);
    if (activeUsers > 0) {
      throw new Error('ROLE.IN_USE');
    }

    await this.roleRepository.deleteRole(id, companyId);
  }
}
