import { Pool } from 'pg';
import {
  PlatformRepository,
  PlatformRoleItem,
  PlatformUserListParams,
  PlatformUserListResult,
  PlatformUserItem,
  PlatformUserUpdateFields,
} from '../../Domains/platform/PlatformRepository';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

/**
 * PostgreSQL implementation of PlatformRepository.
 * Read-only aggregate over users + companies + roles (platform console).
 */
export class PlatformRepositoryPostgres extends PlatformRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async listUsers({
    page,
    limit,
    search,
    companyId,
  }: PlatformUserListParams): Promise<PlatformUserListResult> {
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = ['u.deleted_at IS NULL'];

    if (companyId) {
      params.push(companyId);
      conditions.push(`u.company_id = $${params.length}`);
    }

    if (search && search.trim() !== '') {
      params.push(`%${search.trim()}%`);
      conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users u ${where}`,
      params,
    );

    params.push(limit, offset);
    const result = await this.pool.query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      is_active: boolean;
      is_super_admin: boolean;
      company_id: string | null;
      company_name: string | null;
      role_id: string | null;
      role_name: string | null;
      role_code: string | null;
      created_at: Date;
    }>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.is_active,
         u.is_super_admin,
         u.company_id,
         c.name AS company_name,
         u.role_id,
         r.name AS role_name,
         r.code AS role_code,
         u.created_at
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id AND c.deleted_at IS NULL
       LEFT JOIN roles r ON r.id = u.role_id
       ${where}
       ORDER BY u.is_super_admin DESC, u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      rows: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        isActive: row.is_active,
        isSuperAdmin: row.is_super_admin,
        companyId: row.company_id,
        companyName: row.company_name,
        roleId: row.role_id,
        roleName: row.role_name,
        roleCode: row.role_code,
        createdAt: row.created_at.toISOString(),
      })),
      total: parseInt(countResult.rows[0].count, 10),
    };
  }

  async listRoles(companyId: string): Promise<PlatformRoleItem[]> {
    const result = await this.pool.query<{
      id: string;
      company_id: string;
      code: string;
      name: string;
      description: string | null;
      is_active: boolean;
      user_count: number;
    }>(
      `SELECT r.id, r.company_id, r.code, r.name, r.description, r.is_active,
              COUNT(u.id)::int AS user_count
       FROM roles r
       LEFT JOIN users u ON u.role_id = r.id AND u.deleted_at IS NULL
       WHERE r.company_id = $1
       GROUP BY r.id
       ORDER BY r.is_active DESC, r.name ASC`,
      [companyId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      description: row.description,
      isActive: row.is_active,
      userCount: row.user_count,
    }));
  }

  async updateUser(
    id: string,
    fields: PlatformUserUpdateFields,
    actorId: string,
  ): Promise<PlatformUserItem> {
    const current = await this.getUserForMutation(id);
    if (current.isSuperAdmin) {
      throw new Error('PLATFORM.SUPER_ADMIN_IMMUTABLE');
    }

    const companyId = fields.companyId ?? current.companyId;
    if (!companyId) {
      throw new Error('PLATFORM.COMPANY_REQUIRED');
    }
    const roleId = fields.roleId ?? current.roleId;
    if (!roleId) {
      throw new Error('PLATFORM.ROLE_REQUIRED');
    }
    await this.verifyCompanyAndRole(companyId, roleId);

    const sets: string[] = [];
    const values: unknown[] = [id];
    const assign = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (fields.name !== undefined) assign('name', fields.name.trim());
    if (fields.phone !== undefined) assign('phone', fields.phone);
    if (fields.companyId !== undefined) assign('company_id', companyId);
    if (fields.roleId !== undefined || fields.companyId !== undefined) {
      assign('role_id', roleId);
    }
    if (fields.isActive !== undefined) assign('is_active', fields.isActive);
    if (sets.length === 0) return current;

    sets.push('updated_at = NOW()');
    const result = await this.pool.query(
      `UPDATE users SET ${sets.join(', ')}
       WHERE id = $1 AND deleted_at IS NULL`,
      values,
    );
    if (!result.rowCount) throw new NotFoundError('USER.NOT_FOUND');

    if (fields.companyId !== undefined && fields.companyId !== current.companyId) {
      await this.pool.query('DELETE FROM user_outlets WHERE user_id = $1', [id]);
    }
    if (fields.isActive === false) {
      await this.pool.query('DELETE FROM authentications WHERE user_id = $1', [id]);
    }

    const updated = await this.getUserByIdForPlatform(id);
    await this.recordAudit(actorId, 'UPDATE', id, updated.companyId, current, updated);
    return updated;
  }

  async softDeleteUser(id: string, actorId: string): Promise<void> {
    const current = await this.getUserForMutation(id);
    if (current.isSuperAdmin) {
      throw new Error('PLATFORM.SUPER_ADMIN_IMMUTABLE');
    }

    const result = await this.pool.query(
      `UPDATE users SET deleted_at = NOW(), is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    if (!result.rowCount) throw new NotFoundError('USER.NOT_FOUND');
    await this.pool.query('DELETE FROM authentications WHERE user_id = $1', [id]);
    await this.recordAudit(actorId, 'DELETE', id, current.companyId, current, null);
  }

  async recordAudit(
    actorId: string,
    action: string,
    entityId: string,
    companyId: string | null,
    oldValue?: unknown,
    newValue?: unknown,
    module = 'platform_users',
  ): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs
       (company_id, user_id, module, action, entity_id, old_value, new_value)
       VALUES ($1, $2, $7, $3, $4, $5, $6)`,
      [companyId, actorId, action, entityId, oldValue ?? null, newValue ?? null, module],
    );
  }

  private async verifyCompanyAndRole(companyId: string, roleId: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT r.id
       FROM roles r
       JOIN companies c ON c.id = r.company_id
       WHERE r.id = $1 AND r.company_id = $2
         AND c.deleted_at IS NULL`,
      [roleId, companyId],
    );
    if (!result.rowCount) throw new NotFoundError('ROLE.NOT_FOUND');
  }

  private async getUserForMutation(id: string): Promise<PlatformUserItem> {
    const result = await this.pool.query<{
      id: string;
      name: string;
      email: string;
      phone: string | null;
      is_active: boolean;
      is_super_admin: boolean;
      company_id: string | null;
      company_name: string | null;
      role_id: string | null;
      role_name: string | null;
      role_code: string | null;
      created_at: Date;
    }>(
      `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.is_super_admin,
              u.company_id, c.name AS company_name, u.role_id,
              r.name AS role_name, r.code AS role_code, u.created_at
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );
    if (!result.rowCount) throw new NotFoundError('USER.NOT_FOUND');
    return this.mapUser(result.rows[0]);
  }

  private async getUserByIdForPlatform(id: string): Promise<PlatformUserItem> {
    return this.getUserForMutation(id);
  }

  private mapUser(row: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    is_super_admin: boolean;
    company_id: string | null;
    company_name: string | null;
    role_id: string | null;
    role_name: string | null;
    role_code: string | null;
    created_at: Date;
  }): PlatformUserItem {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isActive: row.is_active,
      isSuperAdmin: row.is_super_admin,
      companyId: row.company_id,
      companyName: row.company_name,
      roleId: row.role_id,
      roleName: row.role_name,
      roleCode: row.role_code,
      createdAt: row.created_at.toISOString(),
    };
  }
}
