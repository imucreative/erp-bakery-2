import { RegisterCompanyUseCase } from '../RegisterCompanyUseCase';
import { CompanyRepository } from '../../../../Domains/companies/CompanyRepository';
import { UserRepository } from '../../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { PasswordHash } from '../../../security/PasswordHash';
import { RegisteredCompany } from '../../../../Domains/companies/entities/RegisteredCompany';
import { RegisteredUser } from '../../../../Domains/users/entities/RegisteredUser';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockCompanyRepository: jest.Mocked<CompanyRepository> = {
  addCompany: jest.fn(),
  verifyAvailableSlug: jest.fn(),
  getCompanyById: jest.fn(),
  generateCompanyCode: jest.fn(),
} as unknown as jest.Mocked<CompanyRepository>;

const mockUserRepository: jest.Mocked<UserRepository> = {
  addUser: jest.fn(),
  verifyAvailableEmail: jest.fn(),
  getPasswordByEmail: jest.fn(),
  getUserWithPermissionsByEmail: jest.fn(),
  getUserWithPermissionsById: jest.fn(),
  getUserById: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const mockRoleRepository: jest.Mocked<RoleRepository> = {
  addRole: jest.fn(),
  getRoleById: jest.fn(),
  getRoleByCode: jest.fn(),
  assignPermissionsToRole: jest.fn(),
  assignAllPermissionsToRole: jest.fn(),
  getRolesByCompanyId: jest.fn(),
} as unknown as jest.Mocked<RoleRepository>;

const mockPasswordHash: jest.Mocked<PasswordHash> = {
  hash: jest.fn(),
  comparePassword: jest.fn(),
} as unknown as jest.Mocked<PasswordHash>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const validPayload = {
  name: 'Toko Roti Makmur',
  slug: 'toko-roti-makmur',
  ownerName: 'Budi Santoso',
  ownerEmail: 'budi@rotimakmur.com',
  ownerPassword: 'Secret1234',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterCompanyUseCase', () => {
  let useCase: RegisterCompanyUseCase;

  beforeEach(() => {
    jest.clearAllMocks();

    useCase = new RegisterCompanyUseCase(
      mockCompanyRepository,
      mockUserRepository,
      mockRoleRepository,
      mockPasswordHash,
    );

    // Default happy-path stubs
    mockCompanyRepository.verifyAvailableSlug.mockResolvedValue(undefined);
    mockUserRepository.verifyAvailableEmail.mockResolvedValue(undefined);
    mockCompanyRepository.generateCompanyCode.mockResolvedValue('COMP-001');
    mockCompanyRepository.addCompany.mockResolvedValue(
      new RegisteredCompany({
        id: 'company-uuid',
        code: 'COMP-001',
        name: 'Toko Roti Makmur',
        slug: 'toko-roti-makmur',
      }),
    );
    mockRoleRepository.addRole.mockResolvedValue('role-uuid');
    mockRoleRepository.assignAllPermissionsToRole.mockResolvedValue(undefined);
    mockRoleRepository.assignPermissionsToRole.mockResolvedValue(undefined);
    mockPasswordHash.hash.mockResolvedValue('hashed_password');
    mockUserRepository.addUser.mockResolvedValue(
      new RegisteredUser({
        id: 'user-uuid',
        name: 'Budi Santoso',
        email: 'budi@rotimakmur.com',
      }),
    );
  });

  it('should register company and return company + owner data', async () => {
    const result = await useCase.execute(validPayload);

    expect(result.company.id).toBe('company-uuid');
    expect(result.company.code).toBe('COMP-001');
    expect(result.company.name).toBe('Toko Roti Makmur');
    expect(result.owner.email).toBe('budi@rotimakmur.com');
  });

  it('should call verifyAvailableSlug with normalised slug', async () => {
    await useCase.execute(validPayload);

    expect(mockCompanyRepository.verifyAvailableSlug).toHaveBeenCalledWith(
      'toko-roti-makmur',
    );
  });

  it('should call verifyAvailableEmail with normalised email', async () => {
    await useCase.execute(validPayload);

    expect(mockUserRepository.verifyAvailableEmail).toHaveBeenCalledWith(
      'budi@rotimakmur.com',
    );
  });

  it('should call generateCompanyCode once', async () => {
    await useCase.execute(validPayload);

    expect(mockCompanyRepository.generateCompanyCode).toHaveBeenCalledTimes(1);
  });

  it('should seed all 5 default roles for the new company', async () => {
    await useCase.execute(validPayload);

    // DEFAULT_ROLES has 5 entries
    expect(mockRoleRepository.addRole).toHaveBeenCalledTimes(5);
  });

  it('should call assignAllPermissionsToRole for OWNER role', async () => {
    await useCase.execute(validPayload);

    expect(mockRoleRepository.assignAllPermissionsToRole).toHaveBeenCalledTimes(1);
  });

  it('should call assignPermissionsToRole for non-OWNER roles', async () => {
    await useCase.execute(validPayload);

    // 4 non-OWNER roles
    expect(mockRoleRepository.assignPermissionsToRole).toHaveBeenCalledTimes(4);
  });

  it('should hash the owner password before persisting', async () => {
    await useCase.execute(validPayload);

    expect(mockPasswordHash.hash).toHaveBeenCalledWith('Secret1234');
    expect(mockUserRepository.addUser).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed_password' }),
      'company-uuid',
      'role-uuid', // OWNER role id
    );
  });

  it('should throw when slug is already taken', async () => {
    mockCompanyRepository.verifyAvailableSlug.mockRejectedValue(
      new Error('COMPANY.SLUG_ALREADY_USED'),
    );

    await expect(useCase.execute(validPayload)).rejects.toThrow(
      'COMPANY.SLUG_ALREADY_USED',
    );
  });

  it('should throw when owner email is already used', async () => {
    mockUserRepository.verifyAvailableEmail.mockRejectedValue(
      new Error('USER.EMAIL_ALREADY_USED'),
    );

    await expect(useCase.execute(validPayload)).rejects.toThrow(
      'USER.EMAIL_ALREADY_USED',
    );
  });

  it('should throw when payload is invalid (domain entity validation)', async () => {
    await expect(useCase.execute({ ...validPayload, slug: 'Invalid Slug!' })).rejects.toThrow(
      'REGISTER_COMPANY.SLUG_CONTAIN_RESTRICTED_CHARACTER',
    );
  });
});
