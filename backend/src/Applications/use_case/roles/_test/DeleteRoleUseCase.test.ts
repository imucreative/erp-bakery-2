import { DeleteRoleUseCase } from '../DeleteRoleUseCase';
import { RoleRepository } from '../../../../Domains/roles/RoleRepository';
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

const companyId = 'company-uuid';
const roleId = 'role-uuid';

function makeRole(code: string): Role {
  return new Role({ id: roleId, companyId, code, name: 'Kasir', description: null, isActive: true });
}

describe('DeleteRoleUseCase', () => {
  let useCase: DeleteRoleUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new DeleteRoleUseCase(mockRoleRepo);
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('KASIR'));
    mockRoleRepo.countUsersUsingRole.mockResolvedValue(0);
    mockRoleRepo.deleteRole.mockResolvedValue(undefined);
  });

  it('should delete a company role that is not OWNER and not in use', async () => {
    await useCase.execute(roleId, companyId);

    expect(mockRoleRepo.getRoleByIdAndCompany).toHaveBeenCalledWith(roleId, companyId);
    expect(mockRoleRepo.countUsersUsingRole).toHaveBeenCalledWith(roleId, companyId);
    expect(mockRoleRepo.deleteRole).toHaveBeenCalledWith(roleId, companyId);
  });

  it('should refuse to delete the OWNER role', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockResolvedValue(makeRole('OWNER'));

    await expect(useCase.execute(roleId, companyId)).rejects.toThrow(
      'ROLE.OWNER_CANNOT_BE_DELETED',
    );
    expect(mockRoleRepo.deleteRole).not.toHaveBeenCalled();
  });

  it('should refuse to delete a role still assigned to active users', async () => {
    mockRoleRepo.countUsersUsingRole.mockResolvedValue(3);

    await expect(useCase.execute(roleId, companyId)).rejects.toThrow('ROLE.IN_USE');
    expect(mockRoleRepo.deleteRole).not.toHaveBeenCalled();
  });

  it('should propagate ROLE.NOT_FOUND (tenant scoping / missing role)', async () => {
    mockRoleRepo.getRoleByIdAndCompany.mockRejectedValue(new Error('ROLE.NOT_FOUND'));

    await expect(useCase.execute(roleId, companyId)).rejects.toThrow('ROLE.NOT_FOUND');
    expect(mockRoleRepo.deleteRole).not.toHaveBeenCalled();
  });
});
