import { UpdateUserUseCase } from '../UpdateUserUseCase';
import {
  UserRepository,
  UserDetail,
} from '../../../../Domains/users/UserRepository';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { OutletRepository } from '../../../../Domains/outlets/OutletRepository';
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

const companyId = 'company-uuid';
const userId = 'user-uuid';
const roleId = 'role-uuid';

const userDetail: UserDetail = {
  id: userId,
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
  outlets: [],
};

const userRecord = {
  id: userId,
  companyId,
  roleId,
  name: 'Kasir Satu',
  email: 'kasir1@a.test',
  phone: null,
  isSuperAdmin: false,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateUserUseCase(
      mockUserRepository,
      mockRoleRepository,
      mockOutletRepository,
    );

    mockUserRepository.getUserDetail.mockResolvedValue(userDetail);
    mockUserRepository.updateUser.mockResolvedValue(userRecord);
    mockUserRepository.setUserOutlets.mockResolvedValue(undefined);
    mockOutletRepository.verifyOutletsBelongToCompany.mockResolvedValue(undefined);
    mockRoleRepository.getRoleByIdAndCompany.mockResolvedValue(
      new Role({ id: roleId, companyId, code: 'KASIR', name: 'Kasir', isActive: true }),
    );
  });

  it('should verify existence then update scalar fields', async () => {
    await useCase.execute(userId, { name: 'Renamed', isActive: false }, companyId);

    expect(mockUserRepository.getUserDetail).toHaveBeenCalledWith(userId, companyId);
    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(userId, companyId, {
      name: 'Renamed',
      isActive: false,
    });
  });

  it('should verify the role belongs to the company when reassigning', async () => {
    await useCase.execute(userId, { roleId }, companyId);

    expect(mockRoleRepository.getRoleByIdAndCompany).toHaveBeenCalledWith(roleId, companyId);
    expect(mockUserRepository.updateUser).toHaveBeenCalledWith(
      userId,
      companyId,
      expect.objectContaining({ roleId }),
    );
  });

  it('should full-sync outlets when outletIds is provided', async () => {
    await useCase.execute(userId, { outletIds: ['o1', 'o2'] }, companyId);

    expect(mockOutletRepository.verifyOutletsBelongToCompany).toHaveBeenCalledWith(
      companyId,
      ['o1', 'o2'],
    );
    expect(mockUserRepository.setUserOutlets).toHaveBeenCalledWith(userId, ['o1', 'o2']);
    // no scalar fields → updateUser not called
    expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it('should clear outlets when outletIds is an empty array', async () => {
    await useCase.execute(userId, { outletIds: [] }, companyId);

    expect(mockOutletRepository.verifyOutletsBelongToCompany).not.toHaveBeenCalled();
    expect(mockUserRepository.setUserOutlets).toHaveBeenCalledWith(userId, []);
  });

  it('should propagate USER.NOT_FOUND when the user is not in the company', async () => {
    mockUserRepository.getUserDetail.mockRejectedValue(new Error('USER.NOT_FOUND'));

    await expect(useCase.execute(userId, { name: 'X' }, companyId)).rejects.toThrow(
      'USER.NOT_FOUND',
    );
    expect(mockUserRepository.updateUser).not.toHaveBeenCalled();
  });

  it('should throw UPDATE_USER.ROLE_INVALID when roleId is not a string', async () => {
    await expect(useCase.execute(userId, { roleId: 123 }, companyId)).rejects.toThrow(
      'UPDATE_USER.ROLE_INVALID',
    );
  });

  it('should throw UPDATE_USER.OUTLETS_INVALID when outletIds is not an array', async () => {
    await expect(
      useCase.execute(userId, { outletIds: 'o1' }, companyId),
    ).rejects.toThrow('UPDATE_USER.OUTLETS_INVALID');
  });
});
