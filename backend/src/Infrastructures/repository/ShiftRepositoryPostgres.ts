import { Pool, PoolClient } from 'pg';
import {
  ShiftRepository,
  ShiftListFilter,
  ShiftListResult,
} from '../../Domains/shifts/ShiftRepository';
import { Shift } from '../../Domains/shifts/entities/Shift';
import { ShiftStatus, canTransition } from '../../Domains/shifts/shiftStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';
import { ConflictError } from '../../Commons/exceptions/ConflictError';

interface HeaderRow {
  id: string;
  company_id: string;
  outlet_id: string;
  cashier_user_id: string;
  opened_at: Date;
  closed_at: Date | null;
  opening_cash: string;
  expected_cash: string | null;
  actual_cash: string | null;
  discrepancy: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = `id, company_id, outlet_id, cashier_user_id, opened_at, closed_at,
  opening_cash, expected_cash, actual_cash, discrepancy, status, notes, created_at, updated_at`;

/**
 * Concrete PostgreSQL implementation of ShiftRepository.
 * Raw SQL, company-scoped. close is atomic & concurrency-safe (row lock).
 */
export class ShiftRepositoryPostgres extends ShiftRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toShift(row: HeaderRow): Shift {
    return new Shift({
      id: row.id,
      companyId: row.company_id,
      outletId: row.outlet_id,
      cashierUserId: row.cashier_user_id,
      openedAt: row.opened_at,
      closedAt: row.closed_at,
      openingCash: Number(row.opening_cash),
      expectedCash: row.expected_cash === null ? null : Number(row.expected_cash),
      actualCash: row.actual_cash === null ? null : Number(row.actual_cash),
      discrepancy: row.discrepancy === null ? null : Number(row.discrepancy),
      status: row.status as ShiftStatus,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async openShift(
    companyId: string,
    cashierUserId: string | null,
    data: { outletId: string; openingCash: number; notes: string | null },
  ): Promise<Shift> {
    try {
      // The partial unique index (status = 'OPEN') is the race-safe guard:
      // a concurrent second OPEN for the same (cashier, outlet) raises 23505.
      const result = await this.pool.query<HeaderRow>(
        `INSERT INTO shifts
           (company_id, outlet_id, cashier_user_id, opening_cash, status, notes, created_by)
         VALUES ($1,$2,$3,$4,'OPEN',$5,$6)
         RETURNING ${COLUMNS}`,
        [companyId, data.outletId, cashierUserId, data.openingCash, data.notes, cashierUserId],
      );
      return this._toShift(result.rows[0]);
    } catch (err) {
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code: string }).code === '23505'
      ) {
        throw new ConflictError('SHIFT.ALREADY_OPEN');
      }
      throw err;
    }
  }

  async closeShift(
    id: string,
    companyId: string,
    userId: string | null,
    data: { actualCash: number; notes: string | null },
  ): Promise<Shift> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${COLUMNS} FROM shifts
         WHERE id = $1 AND company_id = $2 FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('SHIFT.NOT_FOUND');
      }
      const header = headerResult.rows[0];
      const current = header.status as ShiftStatus;

      if (current === 'CLOSED') {
        throw new InvariantError('SHIFT.ALREADY_CLOSED');
      }
      if (!canTransition(current, 'CLOSED')) {
        throw new InvariantError('SHIFT.INVALID_STATUS_TRANSITION');
      }

      // Fase 1: no sales/payment tables yet, so there is no CASH flow to add.
      // expected_cash = opening_cash. Discrepancy = actual_cash - expected_cash.
      //   >> Fase 2 (doc 51 §4.2, OQ-8): expected_cash becomes
      //      opening_cash + Σ(payment CASH) - Σ(refund CASH); non-cash methods
      //      never affect the drawer. This computation will move here then.
      const expectedCash = Number(header.opening_cash);
      const discrepancy = data.actualCash - expectedCash;

      const updated = await client.query<HeaderRow>(
        `UPDATE shifts
         SET status = 'CLOSED',
             closed_at = NOW(),
             expected_cash = $1::numeric,
             actual_cash = $2::numeric,
             discrepancy = $3::numeric,
             notes = COALESCE($4, notes),
             closed_by = $5,
             updated_by = $5,
             updated_at = NOW()
         WHERE id = $6 AND company_id = $7
         RETURNING ${COLUMNS}`,
        [expectedCash, data.actualCash, discrepancy, data.notes, userId, id, companyId],
      );

      await client.query('COMMIT');
      return this._toShift(updated.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<Shift> {
    const result = await this.pool.query<HeaderRow>(
      `SELECT ${COLUMNS} FROM shifts WHERE id = $1 AND company_id = $2`,
      [id, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('SHIFT.NOT_FOUND');
    }
    return this._toShift(result.rows[0]);
  }

  async list(companyId: string, filter: ShiftListFilter): Promise<ShiftListResult> {
    const conditions: string[] = ['company_id = $1'];
    const params: unknown[] = [companyId];

    if (filter.outletId) {
      params.push(filter.outletId);
      conditions.push(`outlet_id = $${params.length}`);
    }
    if (filter.cashierUserId) {
      params.push(filter.cashierUserId);
      conditions.push(`cashier_user_id = $${params.length}`);
    }
    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM shifts WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const result = await this.pool.query<HeaderRow>(
      `SELECT ${COLUMNS} FROM shifts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: result.rows.map((r) => this._toShift(r)), total };
  }
}
