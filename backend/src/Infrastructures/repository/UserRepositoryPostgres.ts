import { Pool } from 'pg';
import {
  UserRepository,
  UserRecord,
  UserWithPermissions,
  UserListFilter,
  UserDetail,
  UserOutletRef,
  UpdateUserFields,
  TwoFactorState,
  MyProfile,
  UpdateMyProfileFields,
  PasswordResetToken,
  PasswordResetUser,
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

  // ── Two-factor authentication (TOTP) ─────────────────────────────────

  async getTwoFactorStateByEmail(email: string): Promise<TwoFactorState> {
    const result = await this.pool.query<TwoFactorRow>(
      `SELECT id, email, is_super_admin, two_factor_enabled, two_factor_secret,
              two_factor_recovery_codes
       FROM users
       WHERE email = $1 AND deleted_at IS NULL`,
      [email],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new AuthenticationError('AUTHENTICATION.CREDENTIALS_NOT_VALID');
    }

    return mapTwoFactorState(result.rows[0]);
  }

  async getTwoFactorStateById(id: string): Promise<TwoFactorState> {
    const result = await this.pool.query<TwoFactorRow>(
      `SELECT id, email, is_super_admin, two_factor_enabled, two_factor_secret,
              two_factor_recovery_codes
       FROM users
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    return mapTwoFactorState(result.rows[0]);
  }

  async saveTwoFactorSetup(
    id: string,
    secretCipher: string,
    recoveryCodeHashes: string[],
  ): Promise<void> {
    const result = await this.pool.query(
      `UPDATE users
       SET two_factor_secret = $2,
           two_factor_recovery_codes = $3,
           two_factor_enabled = FALSE,
           two_factor_confirmed_at = NULL,
           updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, secretCipher, JSON.stringify(recoveryCodeHashes)],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }
  }

  async updateRecoveryCodes(id: string, recoveryCodeHashes: string[]): Promise<void> {
    await this.pool.query(
      `UPDATE users
       SET two_factor_recovery_codes = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, JSON.stringify(recoveryCodeHashes)],
    );
  }

  async setTwoFactorEnabled(id: string, enabled: boolean): Promise<void> {
    const result = enabled
      ? await this.pool.query(
          `UPDATE users
           SET two_factor_enabled = TRUE, two_factor_confirmed_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL`,
          [id],
        )
      : await this.pool.query(
          `UPDATE users
           SET two_factor_enabled = FALSE,
               two_factor_secret = NULL,
               two_factor_recovery_codes = NULL,
               two_factor_confirmed_at = NULL,
               updated_at = NOW()
           WHERE id = $1 AND deleted_at IS NULL`,
          [id],
        );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }
  }

  // ── Password reset ("lupa password") ─────────────────────────────────

  async findActiveUserByEmail(email: string): Promise<PasswordResetUser | null> {
    // Case-insensitive supaya email yang diketik dengan huruf besar/kecil berbeda
    // tetap ditemukan (login sendiri masih case-sensitive — dicatat terpisah).
    const result = await this.pool.query<PasswordResetUser>(
      `SELECT id, name, email FROM users
       WHERE LOWER(email) = LOWER($1) AND is_active = TRUE AND deleted_at IS NULL`,
      [email],
    );

    return result.rowCount && result.rowCount > 0 ? result.rows[0] : null;
  }

  async createPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    requestedIp: string | null,
  ): Promise<void> {
    // Hanya satu token aktif per user: token lama yang belum terpakai dibatalkan.
    await this.pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );

    await this.pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
       VALUES ($1, $2, $3, $4)`,
      [userId, tokenHash, expiresAt, requestedIp],
    );
  }

  async getUsablePasswordResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    const result = await this.pool.query<{
      id: string;
      user_id: string;
      expires_at: Date;
      used_at: Date | null;
    }>(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens
       WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [tokenHash],
    );

    if (!result.rowCount || result.rowCount === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
    };
  }

  async markPasswordResetTokenUsed(id: string): Promise<void> {
    await this.pool.query(`UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1`, [id]);
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE users SET password = $2, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL`,
      [id, passwordHash],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }
  }

  async getPasswordById(id: string): Promise<string> {
    const result = await this.pool.query<{ password: string }>(
      `SELECT password FROM users WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    return result.rows[0].password;
  }

  // ── Self-service profile ─────────────────────────────────────────────

  async getMyProfile(id: string): Promise<MyProfile> {
    const result = await this.pool.query<MyProfileRow>(
      `SELECT
         u.id,
         u.name,
         u.email,
         u.phone,
         u.job_title,
         u.avatar_url,
         r.code AS role_code,
         r.name AS role_name,
         u.company_id,
         c.name AS company_name,
         u.last_login_at,
         u.created_at
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       LEFT JOIN companies c ON c.id = u.company_id AND c.deleted_at IS NULL
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [id],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('USER.NOT_FOUND');
    }

    return mapMyProfile(result.rows[0]);
  }

  async updateMyProfile(id: string, fields: UpdateMyProfileFields): Promise<MyProfile> {
    const sets: string[] = [];
    const values: unknown[] = [id];

    const assign = (column: string, value: unknown) => {
      values.push(value);
      sets.push(`${column} = $${values.length}`);
    };

    if (fields.name !== undefined) assign('name', fields.name);
    if (fields.phone !== undefined) assign('phone', fields.phone);
    if (fields.jobTitle !== undefined) assign('job_title', fields.jobTitle);
    if (fields.avatarUrl !== undefined) assign('avatar_url', fields.avatarUrl);

    if (sets.length > 0) {
      sets.push('updated_at = NOW()');
      const result = await this.pool.query(
        `UPDATE users SET ${sets.join(', ')} WHERE id = $1 AND deleted_at IS NULL`,
        values,
      );
      if (!result.rowCount || result.rowCount === 0) {
        throw new NotFoundError('USER.NOT_FOUND');
      }
    }

    return this.getMyProfile(id);
  }

  async touchLastLogin(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE users SET last_login_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}

interface MyProfileRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  role_code: string | null;
  role_name: string | null;
  company_id: string | null;
  company_name: string | null;
  last_login_at: Date | null;
  created_at: Date;
}

function mapMyProfile(row: MyProfileRow): MyProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    jobTitle: row.job_title,
    avatarUrl: row.avatar_url,
    roleCode: row.role_code,
    roleName: row.role_name,
    companyId: row.company_id,
    companyName: row.company_name,
    lastLoginAt: row.last_login_at ? row.last_login_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

interface TwoFactorRow {
  id: string;
  email: string;
  is_super_admin: boolean;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_recovery_codes: string | null;
}

function mapTwoFactorState(row: TwoFactorRow): TwoFactorState {
  return {
    id: row.id,
    email: row.email,
    isSuperAdmin: row.is_super_admin,
    enabled: row.two_factor_enabled,
    secretCipher: row.two_factor_secret,
    recoveryCodeHashes: parseRecoveryCodeHashes(row.two_factor_recovery_codes),
  };
}

function parseRecoveryCodeHashes(raw: string | null): string[] {
  if (!raw) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
}
