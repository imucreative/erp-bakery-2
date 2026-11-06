import { CreateRoleUseCase } from '../CreateRoleUseCase';
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

function makeRole(code: string): Role {
  return new Role({
    id: 'role-uuid',
    companyId,
    code,
    name: 'Kepala Kasir',
    description: null,
    isActive: true,
  });
}

describe('CreateRoleUseCase', () => {
  let useCase: CreateRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new CreateRoleUseCase(mockRoleRepo, mockPermissionRepo);
    mockRoleRepo.addRoleWithPermissions.mockResolvedValue('role-uuid');
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('CASHIER_LEAD'));
    mockRoleRepo.getRolePermissions.mockResolvedValue(['sales.manage', 'product.read']);
  });

  it('should normalise the code, validate permissions, and persist atomically', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    const result = await useCase.execute(
      {
        code: '  cashier_lead ',
        name: '  Kepala Kasir  ',
        permissions: ['sales.manage', 'product.read'],
      },
      companyId,
    );

    expect(mockPermissionRepo.getIdsByCodes).toHaveBeenCalledWith(['sales.manage', 'product.read']);
    expect(mockRoleRepo.addRoleWithPermissions).toHaveBeenCalledWith(
      {
        companyId,
        code: 'CASHIER_LEAD',
        name: 'Kepala Kasir',
        description: null,
      },
      ['sales.manage', 'product.read'],
    );
    expect(mockRoleRepo.setRolePermissions).not.toHaveBeenCalled();
    expect(result.permissions).toEqual(['sales.manage', 'product.read']);
  });

  it('should reject unknown permission codes', async () => {
    // Only 1 of 2 codes resolved → unknown code present
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);

    await expect(
      useCase.execute(
        {
          code: 'CASHIER_LEAD',
          name: 'Kepala Kasir',
          permissions: ['sales.manage', 'does.not.exist'],
        },
        companyId,
      ),
    ).rejects.toThrow('ROLE.PERMISSION_UNKNOWN');

    expect(mockRoleRepo.addRoleWithPermissions).not.toHaveBeenCalled();
  });

  it('should reject system-administration permissions', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1', 'id-2']);

    await expect(
      useCase.execute(
        { code: 'AUDITOR', name: 'Auditor', permissions: ['sales.manage', 'audit.read'] },
        companyId,
      ),
    ).rejects.toThrow('ROLE.PERMISSION_RESERVED');

    expect(mockRoleRepo.addRoleWithPermissions).not.toHaveBeenCalled();
  });

  it('should not inject role.manage into an OWNER role', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('OWNER'));

    await useCase.execute(
      { code: 'owner', name: 'Owner', permissions: ['product.read'] },
      companyId,
    );

    expect(mockRoleRepo.addRoleWithPermissions).toHaveBeenCalledWith(expect.anything(), [
      'product.read',
    ]);
  });

  it('should map a unique-violation to ROLE.CODE_ALREADY_USED', async () => {
    mockPermissionRepo.getIdsByCodes.mockResolvedValue(['id-1']);
    mockRoleRepo.addRoleWithPermissions.mockRejectedValue({ code: '23505' });

    await expect(
      useCase.execute({ code: 'KASIR', name: 'Kasir', permissions: ['sales.manage'] }, companyId),
    ).rejects.toThrow('ROLE.CODE_ALREADY_USED');
  });

  it('should reject a payload missing required properties', async () => {
    await expect(useCase.execute({ name: 'x' }, companyId)).rejects.toThrow(
      'CREATE_ROLE.NOT_CONTAIN_NEEDED_PROPERTY',
    );
  });

  it('should reject a payload with wrong data types', async () => {
    await expect(
      useCase.execute({ code: 'X', name: 'X', permissions: 'not-an-array' }, companyId),
    ).rejects.toThrow('CREATE_ROLE.NOT_MEET_DATA_TYPE_SPECIFICATION');
  });
});
