import { RegisterUser } from '../../../Domains/users/entities/RegisterUser';
import {
  UserRepository,
  UserDetail,
} from '../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../Domains/roles/RoleRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { PasswordHash } from '../../security/PasswordHash';

interface CreateUserPayload {
  roleId?: unknown;
  outletIds?: unknown;
}

/**
 * UseCase: CreateUserUseCase
 *
 * Invites/creates a user inside the acting company:
 * 1. Validate core fields (via RegisterUser domain entity)
 * 2. Require a role and confirm it belongs to the company
 * 3. Confirm email uniqueness
 * 4. Confirm every outlet belongs to the company
 * 5. Hash password, persist user with role, sync outlet assignments
 * 6. Return the full user detail
 */
export class CreateUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly outletRepository: OutletRepository,
    private readonly passwordHash: PasswordHash,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<UserDetail> {
    const { roleId, outletIds } = (payload ?? {}) as CreateUserPayload;

    if (!roleId || typeof roleId !== 'string') {
      throw new Error('CREATE_USER.ROLE_REQUIRED');
    }

    const registerUser = new RegisterUser(payload);

    const outletList = Array.isArray(outletIds) ? (outletIds as string[]) : [];

    // Role must exist within this company (tenant isolation)
    await this.roleRepository.getRoleByIdAndCompany(roleId, companyId);

    // Email must be globally unique
    await this.userRepository.verifyAvailableEmail(registerUser.email);

    // Every outlet must belong to this company
    if (outletList.length > 0) {
      await this.outletRepository.verifyOutletsBelongToCompany(companyId, outletList);
    }

    registerUser.password = await this.passwordHash.hash(registerUser.password);

    const registered = await this.userRepository.addUser(
      registerUser,
      companyId,
      roleId,
    );

    if (outletList.length > 0) {
      await this.userRepository.setUserOutlets(registered.id, outletList);
    }

    return this.userRepository.getUserDetail(registered.id, companyId);
  }
}
