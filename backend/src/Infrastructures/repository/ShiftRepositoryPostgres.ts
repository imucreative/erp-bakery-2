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
  outlet_name?: string | null;
  cashier_user_id: string;
  cashier_name?: string | null;
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
const READ_COLUMNS = `${COLUMNS},
  (SELECT o.name FROM outlets o
   WHERE o.id = shifts.outlet_id AND o.company_id = shifts.company_id) AS outlet_name,
  (SELECT u.name FROM users u
   WHERE u.id = shifts.cashier_user_id AND u.company_id = shifts.company_id) AS cashier_name`;

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
      outletName: row.outlet_name ?? null,
      cashierUserId: row.cashier_user_id,
      cashierName: row.cashier_name ?? null,
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

      // doc 51 §4.2 / OQ-8: expected_cash =
      //   opening_cash + Σ(CASH payment on this shift) - Σ(CASH refund on this shift).
      // ONLY CASH payments feed the physical drawer; CARD / QRIS / BANK_TRANSFER
      // are recorded for reporting but never affect reconciliation.
      //
      // CASH payments: a sale on this shift keeps its CASH payment in the drawer
      // whether it is still PAID or later REFUNDED, so this sum intentionally
      // counts PAID + REFUNDED orders — the refund side is subtracted separately.
      const cashSumResult = await client.query<{ cash_total: string }>(
        `SELECT COALESCE(SUM(sp.amount), 0) AS cash_total
         FROM sales_payments sp
         JOIN sales_orders so ON so.id = sp.sales_order_id
         WHERE so.shift_id = $1 AND so.company_id = $2
           AND so.status IN ('PAID','REFUNDED') AND sp.payment_method = 'CASH'`,
        [id, companyId],
      );
      const cashPayments = Number(cashSumResult.rows[0].cash_total);

      // CASH refunds (Fase 3, doc 51 §8): a refund takes money back out of the
      // drawer. "Refund on this shift" = a REFUNDED order that BELONGS to this
      // shift AND whose original payment was CASH (deterministic & simple: the
      // cash physically left this shift's drawer). refund_amount = grand_total
      // (full-order). Non-cash orders never touch the drawer, so they are
      // excluded from the refund deduction as well.
      const refundSumResult = await client.query<{ refund_total: string }>(
        `SELECT COALESCE(SUM(sr.refund_amount), 0) AS refund_total
         FROM sales_returns sr
         JOIN sales_orders so ON so.id = sr.sales_order_id
         WHERE so.shift_id = $1 AND sr.company_id = $2
           AND EXISTS (
             SELECT 1 FROM sales_payments sp
             WHERE sp.sales_order_id = so.id AND sp.payment_method = 'CASH'
           )`,
        [id, companyId],
      );
      const cashRefunds = Number(refundSumResult.rows[0].refund_total);
      const expectedCash = Number(header.opening_cash) + cashPayments - cashRefunds;
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
      `SELECT ${READ_COLUMNS} FROM shifts WHERE id = $1 AND company_id = $2`,
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
      `SELECT ${READ_COLUMNS} FROM shifts
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return { rows: result.rows.map((r) => this._toShift(r)), total };
  }
}
