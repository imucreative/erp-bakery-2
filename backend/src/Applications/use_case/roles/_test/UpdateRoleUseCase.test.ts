import { UpdateRoleUseCase } from '../UpdateRoleUseCase';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { PermissionRepository } from '../../../../Domains/permissions/PermissionRepository';
import { Role } from '../../../../Domains/roles/entities/Role';

const mockRoleRepo: jest.Mocked<RoleRepository> = {
  addRole: jest.fn(),
  addRoleWithPermissions: jest.fn(),
  getRoleById: jest.fn(),
  getRoleByIdAndCompany: jest.fn(),
  getRolePermissions: jest.fn(),
  getRoleByCode: jest.fn(),
  assignPermissionsToRole: jest.fn(),
  assignAllPermissionsToRole: jest.fn(),
  getRolesByCompanyId: jest.fn(),
  updateRole: jest.fn(),
  updateRoleWithPermissions: jest.fn(),
  setRolePermissions: jest.fn(),
  deleteRole: jest.fn(),
  countUsersUsingRole: jest.fn(),
} as unknown as jest.Mocked<RoleRepository>;

const mockPermissionRepo: jest.Mocked<PermissionRepository> = {
  getIdsByCodes: jest.fn(),
  getAllPermissions: jest.fn(),
} as unknown as jest.Mocked<PermissionRepository>;

const companyId = 'company-uuid';
const roleId = 'role-uuid';

function makeRole(code: string): Role {
  return new Role({
    id: roleId,
    companyId,
    code,
    name: 'Kasir',
    description: null,
    isActive: true,
  });
}

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateRoleUseCase(mockRoleRepo, mockPermissionRepo);
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('KASIR'));
    mockRoleRepo.updateRoleWithPermissions.mockResolvedValue(makeRole('KASIR'));
    mockRoleRepo.getRolePermissions.mockResolvedValue(['sales.manage']);
  });

  it('should update name/description without touching permissions when none given', async () => {
    await useCase.execute(roleId, { name: 'Kasir Utama' }, companyId);

    expect(mockRoleRepo.updateRoleWithPermissions).toHaveBeenCalledWith(
      roleId,
      companyId,
      { name: 'Kasir Utama' },
      undefined,
    );
    expect(mockRoleRepo.setRolePermissions).not.toHaveBeenCalled();
  });

  it('should full-sync permissions when provided', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    await useCase.execute(roleId, { permissions: ['sales.manage', 'shift.manage'] }, companyId);

    expect(mockRoleRepo.updateRoleWithPermissions).toHaveBeenCalledWith(roleId, companyId, {}, [
      'sales.manage',
      'shift.manage',
    ]);
  });

  it('should reject unknown permission codes on full-sync', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);

    await expect(
      useCase.execute(roleId, { permissions: ['sales.manage', 'ghost.perm'] }, companyId),
    ).rejects.toThrow('ROLE.PERMISSION_UNKNOWN');

    expect(mockRoleRepo.updateRoleWithPermissions).not.toHaveBeenCalled();
  });

  it('should reject system-administration permissions on full-sync', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    await expect(
      useCase.execute(roleId, { permissions: ['sales.manage', 'role.manage'] }, companyId),
    ).rejects.toThrow('ROLE.PERMISSION_RESERVED');

    expect(mockRoleRepo.updateRoleWithPermissions).not.toHaveBeenCalled();
  });

  it('should not inject role.manage into an OWNER role', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('OWNER'));
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);

    await useCase.execute(roleId, { permissions: ['product.read'] }, companyId);

    expect(mockRoleRepo.updateRoleWithPermissions).toHaveBeenCalledWith(roleId, companyId, {}, [
      'product.read',
    ]);
  });

  it('should propagate ROLE.NOT_FOUND (tenant scoping / missing role)', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockRejectedValue(new Error('ROLE.NOT_FOUND'));

    await expect(useCase.execute(roleId, { name: 'X' }, companyId)).rejects.toThrow(
      'ROLE.NOT_FOUND',
    );

    expect(mockRoleRepo.updateRoleWithPermissions).not.toHaveBeenCalled();
  });

  it('should reject an empty payload', async () => {
    await expect(useCase.execute(roleId, {}, companyId)).rejects.toThrow(
      'UPDATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
