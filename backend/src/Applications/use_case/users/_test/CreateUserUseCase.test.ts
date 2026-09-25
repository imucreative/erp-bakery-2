import { CreateUserUseCase } from '../CreateUserUseCase';
import {
  UserRepository,
  UserDetail,
} from '../../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
import { PasswordHash } from '../../../security/PasswordHash';
import { RegisteredUser } from '../../../../Domains/users/entities/RegisteredUser';
import { Role } from '../../../../Domains/roles/entities/Role';

const mockUserRepository: jest.Mocked<UserRepository> = {
  addUser: jest.fn(),
  verifyAvailableEmail: jest.fn(),
  getPasswordByEmail: jest.fn(),
  getUserWithPermissionsByEmail: jest.fn(),
  getUserWithPermissionsById: jest.fn(),
  getUserById: jest.fn(),
  getUsersByCompany: jest.fn(),
  getUserDetail: jest.fn(),
  updateUser: jest.fn(),
  softDeleteUser: jest.fn(),
  setUserOutlets: jest.fn(),
} as unknown as jest.Mocked<UserRepository>;

const mockRoleRepository: jest.Mocked<RoleRepository> = {
  addRole: jest.fn(),
  getRoleById: jest.fn(),
  getRoleByIdAndCompany: jest.fn(),
  getRolePermissions: jest.fn(),
  getRoleByCode: jest.fn(),
  assignPermissionsToRole: jest.fn(),
  assignAllPermissionsToRole: jest.fn(),
  getRolesByCompanyId: jest.fn(),
} as unknown as jest.Mocked<RoleRepository>;

const mockOutletRepository: jest.Mocked<OutletRepository> = {
  addOutlet: jest.fn(),
  generateOutletCode: jest.fn(),
  getOutletsByCompany: jest.fn(),
  getOutletById: jest.fn(),
  updateOutlet: jest.fn(),
  softDeleteOutlet: jest.fn(),
  verifyOutletsBelongToCompany: jest.fn(),
} as unknown as jest.Mocked<OutletRepository>;

const mockPasswordHash: jest.Mocked<PasswordHash> = {
  hash: jest.fn(),
  comparePassword: jest.fn(),
} as unknown as jest.Mocked<PasswordHash>;

const companyId = 'company-uuid';
const roleId = 'role-uuid';

const validPayload = {
  name: 'Kasir Satu',
  email: 'kasir1@a.test',
  password: 'Secret1234',
  roleId,
  outletIds: ['outlet-uuid'],
};

const userDetail: UserDetail = {
  id: 'user-uuid',
  companyId,
  roleId,
  name: 'Kasir Satu',
  email: 'kasir1@a.test',
  phone: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  roleCode: 'KASIR',
  roleName: 'Kasir',
  outlets: [{ outletId: 'outlet-uuid', code: 'OUT-001', name: 'Outlet A', isActive: true }],
};

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateUserUseCase(
      mockUserRepository,
      mockRoleRepository,
      mockOutletRepository,
      mockPasswordHash,
    );

    mockRoleRepository.getRoleByIdAndCompany.mockResolvedValue(
      new Role({ id: roleId, companyId, code: 'KASIR', name: 'Kasir', isActive: true }),
    );
    mockUserRepository.verifyAvailableEmail.mockResolvedValue(undefined);
    mockOutletRepository.verifyOutletsBelongToCompany.mockResolvedValue(undefined);
    mockPasswordHash.hash.mockResolvedValue('hashed_password');
    mockUserRepository.addUser.mockResolvedValue(
      new RegisteredUser({ id: 'user-uuid', name: 'Kasir Satu', email: 'kasir1@a.test' }),
    );
    mockUserRepository.setUserOutlets.mockResolvedValue(undefined);
    mockUserRepository.getUserDetail.mockResolvedValue(userDetail);
  });

  it('should create the user, assign role and outlets, and return detail', async () => {
    const result = await useCase.execute(validPayload, companyId);

    expect(mockRoleRepository.getRoleByIdAndCompany).toHaveBeenCalledWith(roleId, companyId);
    expect(mockUserRepository.verifyAvailableEmail).toHaveBeenCalledWith('kasir1@a.test');
    expect(mockOutletRepository.verifyOutletsBelongToCompany).toHaveBeenCalledWith(
      companyId,
      ['outlet-uuid'],
    );
    expect(mockPasswordHash.hash).toHaveBeenCalledWith('Secret1234');
    expect(mockUserRepository.addUser).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'hashed_password' }),
      companyId,
      roleId,
    );
    expect(mockUserRepository.setUserOutlets).toHaveBeenCalledWith('user-uuid', ['outlet-uuid']);
    expect(result.roleCode).toBe('KASIR');
  });

  it('should not sync outlets when outletIds is empty', async () => {
    await useCase.execute({ ...validPayload, outletIds: [] }, companyId);

    expect(mockOutletRepository.verifyOutletsBelongToCompany).not.toHaveBeenCalled();
    expect(mockUserRepository.setUserOutlets).not.toHaveBeenCalled();
  });

  it('should throw CREATE_USER.ROLE_REQUIRED when roleId is missing', async () => {
    const { roleId: _omit, ...noRole } = validPayload;

    await expect(useCase.execute(noRole, companyId)).rejects.toThrow(
      'CREATE_USER.ROLE_REQUIRED',
    );
    expect(mockUserRepository.addUser).not.toHaveBeenCalled();
  });

  it('should propagate ROLE.NOT_FOUND when role is not in the company', async () => {
    mockRoleRepository.getRoleByIdAndCompany.mockRejectedValue(
      new Error('ROLE.NOT_FOUND'),
    );

    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow('ROLE.NOT_FOUND');
  });

  it('should propagate USER.EMAIL_ALREADY_USED on duplicate email', async () => {
    mockUserRepository.verifyAvailableEmail.mockRejectedValue(
      new Error('USER.EMAIL_ALREADY_USED'),
    );

    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow(
      'USER.EMAIL_ALREADY_USED',
    );
  });

  it('should propagate OUTLET.NOT_FOUND when an outlet is foreign', async () => {
    mockOutletRepository.verifyOutletsBelongToCompany.mockRejectedValue(
      new Error('OUTLET.NOT_FOUND'),
    );

    await expect(useCase.execute(validPayload, companyId)).rejects.toThrow('OUTLET.NOT_FOUND');
  });

  it('should throw on invalid core fields (domain validation)', async () => {
    await expect(
      useCase.execute({ ...validPayload, email: 'not-an-email' }, companyId),
    ).rejects.toThrow('REGISTER_USER.INVALID_EMAIL_FORMAT');
  });
});
