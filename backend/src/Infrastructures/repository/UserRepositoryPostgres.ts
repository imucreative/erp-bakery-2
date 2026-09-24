import { Pool } from 'pg';
import { UserRepository, UserRecord, UserWithPermissions } from '../../Domains/users/UserRepository';
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

  /**
   * Shared query for fetching user + permissions.
   * Joins users → roles → role_permissions → permissions.
   * Returns empty permissions array for SUPER_ADMIN (bypasses permission checks).
   */
  private async _getUserWithPermissions(
    field: 'id' | 'email',
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
