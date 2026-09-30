import { UpdateRoleUseCase } from '../UpdateRoleUseCase';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
import { PermissionRepository } from '../../../../Domains/permissions/PermissionRepository';
import { Role } from '../../../../Domains/roles/entities/Role';

const mockRoleRepo: jest.Mocked<RoleRepository> = {
  addRole: jest.fn(),
  getRoleById: jest.fn(),
  getRoleByIdAndCompany: jest.fn(),
  getRolePermissions: jest.fn(),
  getRoleByCode: jest.fn(),
  assignPermissionsToRole: jest.fn(),
  assignAllPermissionsToRole: jest.fn(),
  getRolesByCompanyId: jest.fn(),
  updateRole: jest.fn(),
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
  return new Role({ id: roleId, companyId, code, name: 'Kasir', description: null, isActive: true });
}

describe('UpdateRoleUseCase', () => {
  let useCase: UpdateRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateRoleUseCase(mockRoleRepo, mockPermissionRepo);
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('KASIR'));
    mockRoleRepo.updateRole.mockResolvedValue(makeRole('KASIR'));
    mockRoleRepo.setRolePermissions.mockResolvedValue(undefined);
    mockRoleRepo.getRolePermissions.mockResolvedValue(['sales.manage']);
  });

  it('should update name/description without touching permissions when none given', async () => {
    await useCase.execute(roleId, { name: 'Kasir Utama' }, companyId);

    expect(mockRoleRepo.updateRole).toHaveBeenCalledWith(roleId, companyId, {
      name: 'Kasir Utama',
      description: undefined,
    });
    expect(mockRoleRepo.setRolePermissions).not.toHaveBeenCalled();
  });

  it('should full-sync permissions when provided', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    await useCase.execute(
      roleId,
      { permissions: ['sales.manage', 'shift.manage'] },
      companyId,
    );

    expect(mockRoleRepo.setRolePermissions).toHaveBeenCalledWith(roleId, [
      'sales.manage',
      'shift.manage',
    ]);
  });

  it('should reject unknown permission codes on full-sync', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);

    await expect(
      useCase.execute(roleId, { permissions: ['sales.manage', 'ghost.perm'] }, companyId),
    ).rejects.toThrow('ROLE.PERMISSION_UNKNOWN');

    expect(mockRoleRepo.setRolePermissions).not.toHaveBeenCalled();
  });

  it('should keep role.manage for OWNER even when the payload removes it', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('OWNER'));
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);

    await useCase.execute(roleId, { permissions: ['product.read'] }, companyId);

    expect(mockRoleRepo.setRolePermissions).toHaveBeenCalledWith(roleId, [
      'product.read',
      'role.manage',
    ]);
  });

  it('should ignore an OWNER guardrail duplicate when role.manage already present', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('OWNER'));
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    await useCase.execute(roleId, { permissions: ['product.read', 'role.manage'] }, companyId);

    expect(mockRoleRepo.setRolePermissions).toHaveBeenCalledWith(roleId, [
      'product.read',
      'role.manage',
    ]);
  });

  it('should propagate ROLE.NOT_FOUND (tenant scoping / missing role)', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockRejectedValue(new Error('ROLE.NOT_FOUND'));

    await expect(
      useCase.execute(roleId, { name: 'X' }, companyId),
    ).rejects.toThrow('ROLE.NOT_FOUND');

    expect(mockRoleRepo.updateRole).not.toHaveBeenCalled();
  });

  it('should reject an empty payload', async () => {
    await expect(useCase.execute(roleId, {}, companyId)).rejects.toThrow(
      'UPDATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });
});
