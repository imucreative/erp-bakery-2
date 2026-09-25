import { Pool } from 'pg';
import {
  UserRepository,
  UserRecord,
  UserWithPermissions,
  UserListFilter,
  UserDetail,
  UserOutletRef,
  UpdateUserFields,
} from '../../Domains/users/UserRepository';
import { RegisterUser } from '../../Domains/users/entities/RegisterUser';
import { RegisteredUser } from '../../Domains/users/entities/RegisteredUser';
import { ConflictError } from '../../Commons/exceptions/ConflictError';
import { AuthenticationError } from '../../Commons/exceptions/AuthenticationError';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

/**
 * Concrete PostgreSQL implementation of UserRepository.
 * All queries use raw SQL — no ORM.
 */
export class UserRepositoryPostgres extends UserRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async addUser(
    data: RegisterUser,
    companyId: string | null,
    roleId: string | null,
  ): Promise<RegisteredUser> {
    const result = await this.pool.query<{ id: string; name: string; email: string }>(
      `INSERT INTO users (name, email, password, phone, company_id, role_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING id, name, email`,
      [data.name, data.email, data.password, data.phone, companyId, roleId],
    );

    return new RegisteredUser(result.rows[0]);
  }

  async verifyAvailableEmail(email: string): Promise<void> {
    const result = await this.pool.query(
      `SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    if (result.rowCount && result.rowCount > 0) {
      throw new ConflictError('USER.EMAIL_ALREADY_USED');
    }
  }

  async getPasswordByEmail(email: string): Promise<string> {
    const result = await this.pool.query<{ password: string }>(
      `SELECT password FROM users
       WHERE email = $1 AND is_active = TRUE AND deleted_at IS NULL`,
      [email],
    );

    if (!result.rowCount || result.rowCount === 0) {
      // Use same error as wrong password — prevents email enumeration
      throw new AuthenticationError('AUTHENTICATION.CREDENTIALS_NOT_VALID');
    }

    return result.rows[0].password;
  }

  async getUserWithPermissionsByEmail(email: string): Promise<UserWithPermissions> {
    return this._getUserWithPermissions('email', email);
  }

  async getUserWithPermissionsById(id: string): Promise<UserWithPermissions> {
    return this._getUserWithPermissions('id', id);
  }

  async getUserById(id: string): Promise<UserRecord> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, company_id, role_id, name, email, phone,
              is_super_admin, is_active, created_at, updated_at
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      companyId: row.company_id,
      roleId: row.role_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isSuperAdmin: row.is_super_admin,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private _toUserRecord(row: {
    id: string;
    company_id: string | null;
    role_id: string | null;
    name: string;
    email: string;
    phone: string | null;
    is_super_admin: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }): UserRecord {
    return {
      id: row.id,
      companyId: row.company_id,
      roleId: row.role_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isSuperAdmin: row.is_super_admin,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getUsersByCompany(
    companyId: string,
    filter: UserListFilter,
  ): Promise<{ rows: UserRecord[]; total: number }> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (filter.roleId) {
      params.push(filter.roleId);
      conditions.push(`role_id = $${params.length}`);
    }
    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM users WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, company_id, role_id, name, email, phone,
              is_super_admin, is_active, created_at, updated_at
       FROM users
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toUserRecord(row)), total };
  }

  async getUserDetail(id: string, companyId: string): Promise<UserDetail> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      role_code: string | null;
      role_name: string | null;
    }>(
      `SELECT u.id, u.company_id, u.role_id, u.name, u.email, u.phone,
              u.is_super_admin, u.is_active, u.created_at, u.updated_at,
              r.code AS role_code, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1 AND u.company_id = $2 AND u.deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    const row = result.rows[0];
    const outletsResult = await this.pool.query<{
      outlet_id: string;
      code: string;
      name: string;
      is_active: boolean;
    }>(
      `SELECT o.id AS outlet_id, o.code, o.name, o.is_active
       FROM user_outlets uo
       JOIN outlets o ON o.id = uo.outlet_id
       WHERE uo.user_id = $1 AND uo.is_active = TRUE AND o.deleted_at IS NULL
       ORDER BY o.code ASC`,
      [id],
    );

    const outlets: UserOutletRef[] = outletsResult.rows.map((o) => ({
      outletId: o.outlet_id,
      code: o.code,
      name: o.name,
      isActive: o.is_active,
    }));

    return {
      ...this._toUserRecord(row),
      roleCode: row.role_code,
      roleName: row.role_name,
      outlets,
    };
  }

  async updateUser(
    id: string,
    companyId: string,
    fields: UpdateUserFields,
  ): Promise<UserRecord> {
    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.phone !== undefined) {
      params.push(fields.phone);
      setClauses.push(`phone = $${params.length}`);
    }
    if (fields.roleId !== undefined) {
      params.push(fields.roleId);
      setClauses.push(`role_id = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return this._getUserRecordScoped(id, companyId);
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, companyId);

    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `UPDATE users
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING id, company_id, role_id, name, email, phone,
                 is_super_admin, is_active, created_at, updated_at`,
      params,
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    return this._toUserRecord(result.rows[0]);
  }

  async softDeleteUser(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE users
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }
  }

  async setUserOutlets(userId: string, outletIds: string[]): Promise<void> {
    const uniqueIds = Array.from(new Set(outletIds));

    // Full-sync: remove assignments not in the new set, upsert the rest.
    if (uniqueIds.length === 0) {
      await this.pool.query(`DELETE FROM user_outlets WHERE user_id = $1`, [userId]);
      return;
    }

    const placeholders = uniqueIds.map((_, i) => `$${i + 2}`).join(', ');
    await this.pool.query(
      `DELETE FROM user_outlets
       WHERE user_id = $1 AND outlet_id NOT IN (${placeholders})`,
      [userId, ...uniqueIds],
    );

    const values = uniqueIds.map((_, i) => `($1, $${i + 2})`).join(', ');
    await this.pool.query(
      `INSERT INTO user_outlets (user_id, outlet_id)
       VALUES ${values}
       ON CONFLICT (user_id, outlet_id) DO UPDATE SET is_active = TRUE`,
      [userId, ...uniqueIds],
    );
  }

  private async _getUserRecordScoped(id: string, companyId: string): Promise<UserRecord> {
    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
    }>(
      `SELECT id, company_id, role_id, name, email, phone,
              is_super_admin, is_active, created_at, updated_at
       FROM users
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    return this._toUserRecord(result.rows[0]);
  }

  /**
   * Shared query for fetching user + permissions.
   * Joins users → roles → role_permissions → permissions.
   * Returns empty permissions array for SUPER_ADMIN (bypasses permission checks).
   */
  private async _getUserWithPermissions(    field: 'id' | 'email',
    value: string,
  ): Promise<UserWithPermissions> {
    const col = field === 'id' ? 'u.id' : 'u.email';

    const result = await this.pool.query<{
      id: string;
      company_id: string | null;
      role_id: string | null;
      name: string;
      email: string;
      phone: string | null;
      is_super_admin: boolean;
      is_active: boolean;
      created_at: Date;
      updated_at: Date;
      role_code: string | null;
      permissions: string | null; // aggregated as comma-separated string
    }>(
      `SELECT
         u.id,
         u.company_id,
         u.role_id,
         u.name,
         u.email,
         u.phone,
         u.is_super_admin,
         u.is_active,
         u.created_at,
         u.updated_at,
         r.code AS role_code,
         STRING_AGG(DISTINCT p.code, ',') AS permissions
       FROM users u
       LEFT JOIN roles r        ON r.id = u.role_id
       LEFT JOIN role_permissions rp ON rp.role_id = r.id
       LEFT JOIN permissions p  ON p.id = rp.permission_id
       WHERE ${col} = $1
         AND u.is_active = TRUE
         AND u.deleted_at IS NULL
       GROUP BY u.id, u.company_id, u.role_id, u.name, u.email,
                u.phone, u.is_super_admin, u.is_active,
                u.created_at, u.updated_at, r.code`,
      [value],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AuthenticationError('AUTHENTICATION.CREDENTIALS_NOT_VALID');
    }

    const row = result.rows[0];
    return {
      id: row.id,
      companyId: row.company_id,
      roleId: row.role_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      isSuperAdmin: row.is_super_admin,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roleCode: row.role_code,
      permissions: row.permissions ? row.permissions.split(',').filter(Boolean) : [],
    };
  }
}
