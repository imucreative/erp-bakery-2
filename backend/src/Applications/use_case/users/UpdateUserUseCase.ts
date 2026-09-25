import {
  UserRepository,
  UserDetail,
  UpdateUserFields,
} from '../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../Domains/roles/RoleRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';

interface UpdateUserPayload {
  name?: unknown;
  phone?: unknown;
  roleId?: unknown;
  isActive?: unknown;
  outletIds?: unknown;
}

/**
 * UseCase: UpdateUserUseCase
 *
 * Updates a user inside the acting company. Confirms the target user, any new
 * role, and any outlet assignments all belong to the same company tenant.
 */
export class UpdateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<UserDetail> {
    // Ensures the user exists and belongs to this company (throws USER.NOT_FOUND)
    await this.userRepository.getUserDetail(id, companyId);

    const { name, phone, roleId, isActive, outletIds } = (payload ?? {}) as UpdateUserPayload;

    const fields: UpdateUserFields = {};
    if (name !== undefined) fields.name = String(name).trim();
    if (phone !== undefined) fields.phone = phone === null ? null : String(phone).trim();
    if (isActive !== undefined) fields.isActive = Boolean(isActive);

    if (roleId !== undefined) {
      if (!roleId || typeof roleId !== 'string') {
        throw new Error('UPDATE_USER.ROLE_INVALID');
      }
      await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);
      fields.roleId = roleId;
    }

    if (Object.keys(fields).length > 0) {
      await this.userRepository.updateUser(id, companyId, fields);
    }

    if (outletIds !== undefined) {
      if (!Array.isArray(outletIds)) {
        throw new Error('UPDATE_USER.OUTLETS_INVALID');
      }
      const outletList = outletIds as string[];
      if (outletList.length > 0) {
        await this.outletRepository.verifyOutletsBelongToCompany(companyId, outletList);
      }
      await this.userRepository.setUserOutlets(id, outletList);
    }

    return this.userRepository.getUserDetail(id, companyId);
  }
}
