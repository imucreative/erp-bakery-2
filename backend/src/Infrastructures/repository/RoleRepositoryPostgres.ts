import { Pool } from 'pg';
import { RoleRepository, CreateRoleData } from '../../Domains/roles/RoleRepository';
import { Role } from '../../Domains/roles/entities/Role';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

/**
 * Concrete PostgreSQL implementation of RoleRepository.
 */
export class RoleRepositoryPostgres extends RoleRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async addRole(data: CreateRoleData): Promise<string> {
    const result = await this.pool.query<{ id: string }>(
      `INSERT INTO roles (company_id, code, name, description)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [data.companyId, data.code, data.name, data.description ?? null],
    );

    return result.rows[0].id;
  }

  async getRoleById(id: string): Promise<Role> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
    }>(
      `SELECT id, company_id, code, name, description, is_active
       FROM roles
       WHERE id = $1`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('ROLE.NOT_FOUND');
    }

    const row = result.rows[0];
    return new Role({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
    });
  }

  async getRoleByIdAndCompany(id: string, companyId: string): Promise<Role> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
    }>(
      `SELECT id, company_id, code, name, description, is_active
       FROM roles
       WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('ROLE.NOT_FOUND');
    }

    const row = result.rows[0];
    return new Role({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
    });
  }

  async getRolePermissions(roleId: string): Promise<string[]> {
    const result = await this.pool.query<{ code: string }>(
      `SELECT p.code
       FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.sort_order ASC, p.code ASC`,
      [roleId],
    );

    return result.rows.map((r) => r.code);
  }

  async getRoleByCode(code: string, companyId: string | null): Promise<Role> {    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
    }>(
      `SELECT id, company_id, code, name, description, is_active
       FROM roles
       WHERE code = $1
         AND (company_id = $2 OR ($2::uuid IS NULL AND company_id IS NULL))`,
      [code, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('ROLE.NOT_FOUND');
    }

    const row = result.rows[0];
    return new Role({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
    });
  }

  async assignPermissionsToRole(roleId: string, permissionCodes: string[]): Promise<void> {
    if (permissionCodes.length === 0) return;

    // Resolve codes → IDs in a single query
    const placeholders = permissionCodes.map((_, i) => `$${i + 1}`).join(', ');
    const permResult = await this.pool.query<{ id: string }>(
      `SELECT id FROM permissions WHERE code IN (${placeholders})`,
      permissionCodes,
    );

    if (permResult.rows.length === 0) return;

    // Bulk insert — idempotent via ON CONFLICT DO NOTHING
    const values = permResult.rows
      .map((_, i) => `($1, $${i + 2})`)
      .join(', ');

    const params: (string)[] = [roleId, ...permResult.rows.map((r) => r.id)];

    await this.pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ${values}
       ON CONFLICT DO NOTHING`,
      params,
    );
  }

  async assignAllPermissionsToRole(roleId: string): Promise<void> {
    await this.pool.query(
      `INSERT INTO role_permissions (role_id, permission_id)
       SELECT $1, id FROM permissions
       ON CONFLICT DO NOTHING`,
      [roleId],
    );
  }

  async getRolesByCompanyId(companyId: string): Promise<Role[]> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
    }>(
      `SELECT id, company_id, code, name, description, is_active
       FROM roles
       WHERE company_id = $1
       ORDER BY name ASC`,
      [companyId],
    );

    return result.rows.map(
      (row) =>
        new Role({
          id: row.id,
          companyId: row.company_id,
          code: row.code,
          name: row.name,
          description: row.description,
          isActive: row.is_active,
        }),
    );
  }
}
