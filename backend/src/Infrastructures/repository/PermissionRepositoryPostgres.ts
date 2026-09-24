import { Pool } from 'pg';
import { PermissionRepository } from '../../Domains/permissions/PermissionRepository';

/**
 * Concrete PostgreSQL implementation of PermissionRepository.
 */
export class PermissionRepositoryPostgres extends PermissionRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  async getIdsByCodes(codes: string[]): Promise<string[]> {
    if (codes.length === 0) return [];

    const placeholders = codes.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.pool.query<{ id: string }>(
      `SELECT id FROM permissions WHERE code IN (${placeholders})`,
      codes,
    );

    return result.rows.map((r) => r.id);
  }

  async getAllPermissions(): Promise<
    Array<{
      id: string;
      code: string;
      name: string;
      domain: string | null;
      moduleKey: string | null;
      moduleName: string | null;
      action: string | null;
      sortOrder: number;
    }>
  > {
    const result = await this.pool.query<{
      id: string;
      code: string;
      name: string;
      domain: string | null;
      module_key: string | null;
      module_name: string | null;
      action: string | null;
      sort_order: number;
    }>(
      `SELECT id, code, name, domain, module_key, module_name, action, sort_order
       FROM permissions
       ORDER BY sort_order ASC, code ASC`,
    );

    return result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      domain: row.domain,
      moduleKey: row.module_key,
      moduleName: row.module_name,
      action: row.action,
      sortOrder: row.sort_order,
    }));
  }
}
