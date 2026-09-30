import { PermissionRepositoryPostgres } from '../PermissionRepositoryPostgres';
import { Pool } from 'pg';

const mockPool = { query: jest.fn() } as unknown as Pool;

describe('PermissionRepositoryPostgres', () => {
  let repo: PermissionRepositoryPostgres;

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PermissionRepositoryPostgres(mockPool);
  });

  describe('getIdsByCodes', () => {
    it('should return an empty array for an empty input', async () => {
      expect(await repo.getIdsByCodes([])).toEqual([]);
      expect(mockPool.query as jest.Mock).not.toHaveBeenCalled();
    });

    it('should resolve codes to ids', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [{ id: 'id-1' }, { id: 'id-2' }],
        rowCount: 2,
      });

      const ids = await repo.getIdsByCodes(['role.read', 'role.manage']);
      expect(ids).toEqual(['id-1', 'id-2']);
    });
  });

  describe('getAllPermissions', () => {
    it('should map snake_case columns to camelCase metadata ordered by sortOrder', async () => {
      (mockPool.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            id: 'id-1',
            code: 'role.read',
            name: 'View Roles',
            domain: 'system-administration',
            module_key: 'role',
            module_name: 'Role',
            action: 'read',
            sort_order: 20,
          },
        ],
        rowCount: 1,
      });

      const perms = await repo.getAllPermissions();

      const [sql] = (mockPool.query as jest.Mock).mock.calls[0];
      expect(sql).toContain('ORDER BY sort_order ASC');
      expect(perms[0]).toEqual({
        id: 'id-1',
        code: 'role.read',
        name: 'View Roles',
        domain: 'system-administration',
        moduleKey: 'role',
        moduleName: 'Role',
        action: 'read',
        sortOrder: 20,
      });
    });
  });
});
