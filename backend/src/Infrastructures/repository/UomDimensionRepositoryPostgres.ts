import { Pool, PoolClient } from 'pg';
import {
  UomDimensionRepository,
  NewUomDimensionData,
} from '../../Domains/uom-dimensions/UomDimensionRepository';
import { UomDimensionDefinition } from '../../Domains/uom-dimensions/entities/UomDimensionDefinition';
import { UpdateUomDimensionFields } from '../../Domains/uom-dimensions/entities/UpdateUomDimension';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface UomDimensionRow {
  code: string;
  name: string;
  canonical_unit_name: string;
  canonical_unit_symbol: string;
  is_active: boolean;
}

const SELECT_COLUMNS = `code, name, canonical_unit_name, canonical_unit_symbol, is_active`;

interface UomCountRow {
  count: string;
}

/**
 * Concrete PostgreSQL implementation of UomDimensionRepository.
 * Dimensions are global reference data (no company scope).
 */
export class UomDimensionRepositoryPostgres extends UomDimensionRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toDefinition(row: UomDimensionRow): UomDimensionDefinition {
    return new UomDimensionDefinition({
      code: row.code,
      name: row.name,
      canonicalUnitName: row.canonical_unit_name,
      canonicalUnitSymbol: row.canonical_unit_symbol,
      isActive: row.is_active,
    });
  }

  async listActive(): Promise<UomDimensionDefinition[]> {
    return this._list(true);
  }

  async listAll(): Promise<UomDimensionDefinition[]> {
    return this._list(false);
  }

  private async _list(activeOnly: boolean): Promise<UomDimensionDefinition[]> {
    const result = await this.pool.query<UomDimensionRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM uom_dimensions
       ${activeOnly ? 'WHERE is_active = TRUE' : ''}
       ORDER BY name ASC, code ASC`,
    );
    return result.rows.map((row) => this._toDefinition(row));
  }

  async getByCode(code: string): Promise<UomDimensionDefinition> {
    const result = await this.pool.query<UomDimensionRow>(
      `SELECT ${SELECT_COLUMNS} FROM uom_dimensions WHERE code = $1`,
      [code],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('UOM_DIMENSION.NOT_FOUND');
    }

    return this._toDefinition(result.rows[0]);
  }

  async addDimension(
    data: NewUomDimensionData,
    companyId: string,
  ): Promise<UomDimensionDefinition> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query<UomDimensionRow>(
        `INSERT INTO uom_dimensions
           (code, name, canonical_unit_name, canonical_unit_symbol, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${SELECT_COLUMNS}`,
        [data.code, data.name, data.canonicalUnitName, data.canonicalUnitSymbol, data.isActive],
      );

      const uomCode = await this._generateUomCode(client, companyId);
      await client.query(
        `INSERT INTO uoms (company_id, code, name, dimension, factor_to_canonical)
         VALUES ($1, $2, $3, $4, 1)`,
        [companyId, uomCode, data.canonicalUnitName, data.code],
      );

      await client.query('COMMIT');
      return this._toDefinition(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (isUniqueViolation(error)) {
        throw new ConflictError('UOM_DIMENSION.CODE_ALREADY_USED');
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async _generateUomCode(client: PoolClient, companyId: string): Promise<string> {
    const result = await client.query<UomCountRow>(
      `SELECT COUNT(*) AS count FROM uoms WHERE company_id = $1`,
      [companyId],
    );
    const seq = parseInt(result.rows[0].count, 10) + 1;
    return `UOM-${String(seq).padStart(3, '0')}`;
  }

  async updateDimension(
    code: string,
    fields: UpdateUomDimensionFields,
  ): Promise<UomDimensionDefinition> {
    const existing = await this.getByCode(code);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(code);

    const result = await this.pool.query<UomDimensionRow>(
      `UPDATE uom_dimensions
       SET ${setClauses.join(', ')}
       WHERE code = $${params.length}
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toDefinition(result.rows[0]);
  }

  async deleteDimension(code: string): Promise<void> {
    try {
      const result = await this.pool.query(`DELETE FROM uom_dimensions WHERE code = $1`, [code]);

      if (!result.rowCount || result.rowCount === 0) {
        throw new NotFoundError('UOM_DIMENSION.NOT_FOUND');
      }
    } catch (error) {
      if (isDimensionInUse(error)) {
        throw new ConflictError('UOM_DIMENSION.IN_USE');
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return (error as { code?: string }).code === '23505';
}

function isDimensionInUse(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const pgError = error as { code?: string; constraint?: string };
  return pgError.code === '23503' && pgError.constraint === 'uoms_dimension_fk';
}
