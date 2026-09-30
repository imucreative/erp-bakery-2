import { Pool } from 'pg';
import {
  PaymentTermRepository,
  PaymentTermListFilter,
  PaymentTermListResult,
  NewPaymentTermData,
} from '../../Domains/payment-terms/PaymentTermRepository';
import { PaymentTerm } from '../../Domains/payment-terms/entities/PaymentTerm';
import { UpdatePaymentTermFields } from '../../Domains/payment-terms/entities/UpdatePaymentTerm';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';

interface PaymentTermRow {
  id: string;
  company_id: string;
  code: string;
  name: string;
  due_days: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLUMNS = `id, company_id, code, name, due_days, is_active, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of PaymentTermRepository.
 * Raw SQL via pg Pool — no ORM. Scoped by company_id, excludes soft-deleted rows.
 */
export class PaymentTermRepositoryPostgres extends PaymentTermRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toPaymentTerm(row: PaymentTermRow): PaymentTerm {
    return new PaymentTerm({
      id: row.id,
      companyId: row.company_id,
      code: row.code,
      name: row.name,
      dueDays: Number(row.due_days),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async addPaymentTerm(data: NewPaymentTermData, companyId: string): Promise<PaymentTerm> {
    const result = await this.pool.query<PaymentTermRow>(
      `INSERT INTO payment_terms (company_id, code, name, due_days)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SELECT_COLUMNS}`,
      [companyId, data.code, data.name, data.dueDays],
    );

    return this._toPaymentTerm(result.rows[0]);
  }

  async isCodeTaken(code: string, companyId: string, excludeId?: string): Promise<boolean> {
    const params: unknown[] = [code, companyId];
    let query = `SELECT 1 FROM payment_terms
       WHERE code = $1 AND company_id = $2 AND deleted_at IS NULL`;

    if (excludeId) {
      params.push(excludeId);
      query += ` AND id <> $${params.length}`;
    }

    const result = await this.pool.query(query, params);
    return (result.rowCount ?? 0) > 0;
  }

  async getPaymentTermsByCompany(
    companyId: string,
    filter: PaymentTermListFilter,
  ): Promise<PaymentTermListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(name ILIKE $${params.length} OR code ILIKE $${params.length})`);
    }

    if (filter.isActive !== undefined) {
      params.push(filter.isActive);
      conditions.push(`is_active = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM payment_terms WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const rowsResult = await this.pool.query<PaymentTermRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM payment_terms
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: rowsResult.rows.map((row) => this._toPaymentTerm(row)), total };
  }

  async getActivePaymentTerms(companyId: string): Promise<PaymentTerm[]> {
    const result = await this.pool.query<PaymentTermRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM payment_terms
       WHERE company_id = $1 AND deleted_at IS NULL AND is_active = TRUE
       ORDER BY code ASC`,
      [companyId],
    );

    return result.rows.map((row) => this._toPaymentTerm(row));
  }

  async getPaymentTermById(id: string, companyId: string): Promise<PaymentTerm> {
    const result = await this.pool.query<PaymentTermRow>(
      `SELECT ${SELECT_COLUMNS}
       FROM payment_terms
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PAYMENT_TERM.NOT_FOUND');
    }

    return this._toPaymentTerm(result.rows[0]);
  }

  async updatePaymentTerm(
    id: string,
    companyId: string,
    fields: UpdatePaymentTermFields,
  ): Promise<PaymentTerm> {
    const existing = await this.getPaymentTermById(id, companyId);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    if (fields.name !== undefined) {
      params.push(fields.name);
      setClauses.push(`name = $${params.length}`);
    }
    if (fields.dueDays !== undefined) {
      params.push(fields.dueDays);
      setClauses.push(`due_days = $${params.length}`);
    }
    if (fields.isActive !== undefined) {
      params.push(fields.isActive);
      setClauses.push(`is_active = $${params.length}`);
    }

    if (setClauses.length === 0) {
      return existing;
    }

    setClauses.push('updated_at = NOW()');
    params.push(id, companyId);

    const result = await this.pool.query<PaymentTermRow>(
      `UPDATE payment_terms
       SET ${setClauses.join(', ')}
       WHERE id = $${params.length - 1} AND company_id = $${params.length} AND deleted_at IS NULL
       RETURNING ${SELECT_COLUMNS}`,
      params,
    );

    return this._toPaymentTerm(result.rows[0]);
  }

  async softDeletePaymentTerm(id: string, companyId: string): Promise<void> {
    const result = await this.pool.query(
      `UPDATE payment_terms
       SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );

    if (!result.rowCount || result.rowCount === 0) {
      throw new NotFoundError('PAYMENT_TERM.NOT_FOUND');
    }
  }

  async countActiveDependents(_id: string, _companyId: string): Promise<number> {
    // No module references payment terms yet. When Purchase Orders / Vendor
    // Invoices adopt payment terms, add the dependent COUNT(*) query here.
    return 0;
  }
}
