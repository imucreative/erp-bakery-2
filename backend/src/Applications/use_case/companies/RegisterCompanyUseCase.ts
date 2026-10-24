import { RegisterCompany } from '../../../Domains/companies/entities/RegisterCompany';
import { RegisteredCompany } from '../../../Domains/companies/entities/RegisteredCompany';
import { CompanyRepository } from '../../../Domains/companies/CompanyRepository';
import { UserRepository } from '../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../Domains/roles/RoleRepository';
import { RegisterUser } from '../../../Domains/users/entities/RegisterUser';
import { PasswordHash } from '../../security/PasswordHash';
import { DEFAULT_ROLES } from '../../../Infrastructures/database/seeds/permissions.seed';

/**
 * UseCase: RegisterCompanyUseCase
 *
 * Orchestrates the full SaaS company registration flow:
 * 1. Validate & normalise input (via domain entities)
 * 2. Check slug uniqueness
 * 3. Check owner email uniqueness
 * 4. Generate company code
 * 5. Persist company
 * 6. Seed default roles (OWNER, SUPERVISOR_OUTLET, ADMIN_GUDANG, PRODUKSI, KASIR) for the company
 * 7. Assign permissions to each role
 * 8. Hash owner password
 * 9. Persist owner user with OWNER role
 *
 * All steps run inside a single DB transaction managed by the caller
 * (InfrastructuresModule passes a transactional pool client).
 */
export class RegisterCompanyUseCase {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly userRepository: UserRepository,
    private readonly roleRepository: RoleRepository,
    private readonly passwordHash: PasswordHash,
  ) {}

  async execute(payload: unknown): Promise<{
    company: RegisteredCompany;
    owner: { id: string; name: string; email: string };
  }> {
    // Step 1 — validate inputs via domain entities
    const registerCompany = new RegisterCompany(payload);
    const registerUser = new RegisterUser({
      name: registerCompany.ownerName,
      email: registerCompany.ownerEmail,
      password: registerCompany.ownerPassword,
    });

    // Step 2 — check slug uniqueness
    await this.companyRepository.verifyAvailableSlug(registerCompany.slug);

    // Step 3 — check owner email uniqueness
    await this.userRepository.verifyAvailableEmail(registerUser.email);

    // Step 4 — generate company code
    const companyCode = await this.companyRepository.generateCompanyCode();

    // Step 5 — persist company
    const registeredCompany = await this.companyRepository.addCompany(
      Object.assign(registerCompany, { code: companyCode }),
    );

    // Step 6 & 7 — seed default roles + permissions scoped to this company
    const roleIdMap: Record<string, string> = {};

    for (const roleDef of DEFAULT_ROLES) {
      const roleId = await this.roleRepository.addRole({
        companyId: registeredCompany.id,
        code: roleDef.code,
        name: roleDef.name,
        description: roleDef.description,
      });

      roleIdMap[roleDef.code] = roleId;

      await this.roleRepository.assignPermissionsToRole(
        roleId,
        roleDef.permissions,
      );
    }

    // Step 8 — hash owner password
    registerUser.password = await this.passwordHash.hash(registerUser.password);

    // Step 9 — persist owner user
    const ownerRoleId = roleIdMap['OWNER'];
    const registeredOwner = await this.userRepository.addUser(
      registerUser,
      registeredCompany.id,
      ownerRoleId,
    );

    return {
      company: registeredCompany,
      owner: {
        id: registeredOwner.id,
        name: registeredOwner.name,
        email: registeredOwner.email,
      },
    };
  }
}
