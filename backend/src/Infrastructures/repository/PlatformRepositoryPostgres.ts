import { Pool } from 'pg';
import {
  PlatformRepository,
  PlatformUserListParams,
  PlatformUserListResult,
} from '../../Domains/platform/PlatformRepository';

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
}
