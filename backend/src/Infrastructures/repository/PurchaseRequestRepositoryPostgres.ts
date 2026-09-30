import { Pool, PoolClient } from 'pg';
import {
  PurchaseRequestRepository,
  NewPurchaseRequestData,
  PurchaseRequestListFilter,
  PurchaseRequestListResult,
} from '../../Domains/purchase-requests/PurchaseRequestRepository';
import {
  PurchaseRequest,
  PurchaseRequestItem,
  PurchaseRequestStatusLog,
} from '../../Domains/purchase-requests/entities/PurchaseRequest';
import {
  PurchaseRequestStatus,
  canTransition,
  isEditableStatus,
} from '../../Domains/purchase-requests/purchaseRequestStatus';
import { NotFoundError } from '../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../Commons/exceptions/InvariantError';

interface HeaderRow {
  id: string;
  company_id: string;
  pr_number: string;
  requestor_id: string | null;
  destination_outlet_id: string;
  expected_date: Date;
  total_estimated_amount: string;
  status: string;
  notes: string | null;
  approved_by: string | null;
  approved_at: Date | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ItemRow {
  id: string;
  product_id: string;
  quantity: string;
  uom_id: string;
  estimated_price: string;
  subtotal: string;
}

interface LogRow {
  id: string;
  from_status: string | null;
  to_status: string;
  actor_id: string | null;
  note: string | null;
  created_at: Date;
}

const HEADER_COLUMNS = `id, company_id, pr_number, requestor_id, destination_outlet_id,
  expected_date, total_estimated_amount, status, notes, approved_by, approved_at,
  created_by, updated_by, created_at, updated_at`;
const ITEM_COLUMNS = `id, product_id, quantity, uom_id, estimated_price, subtotal`;
const LOG_COLUMNS = `id, from_status, to_status, actor_id, note, created_at`;

/**
 * Concrete PostgreSQL implementation of PurchaseRequestRepository.
 *
 * Raw SQL, company-scoped. Create-with-items and every status transition run
 * in a transaction, and each transition writes a purchase_request_status_logs
 * row atomically with the header change so the timeline never drifts.
 */
export class PurchaseRequestRepositoryPostgres extends PurchaseRequestRepository {
  constructor(private readonly pool: Pool) {
    super();
  }

  private _toItem(row: ItemRow): PurchaseRequestItem {
    return {
      id: row.id,
      productId: row.product_id,
      quantity: Number(row.quantity),
      uomId: row.uom_id,
      estimatedPrice: Number(row.estimated_price),
      subtotal: Number(row.subtotal),
    };
  }

  private _toLog(row: LogRow): PurchaseRequestStatusLog {
    return {
      id: row.id,
      fromStatus: (row.from_status as PurchaseRequestStatus) ?? null,
      toStatus: row.to_status as PurchaseRequestStatus,
      actorId: row.actor_id,
      note: row.note,
      createdAt: row.created_at,
    };
  }

  private _toPurchaseRequest(
    header: HeaderRow,
    items: ItemRow[],
    logs: LogRow[],
  ): PurchaseRequest {
    return new PurchaseRequest({
      id: header.id,
      companyId: header.company_id,
      prNumber: header.pr_number,
      requestorId: header.requestor_id,
      destinationOutletId: header.destination_outlet_id,
      expectedDate: header.expected_date,
      totalEstimatedAmount: Number(header.total_estimated_amount),
      status: header.status as PurchaseRequestStatus,
      notes: header.notes,
      items: items.map((i) => this._toItem(i)),
      statusLogs: logs.map((l) => this._toLog(l)),
      approvedBy: header.approved_by,
      approvedAt: header.approved_at,
      createdBy: header.created_by,
      updatedBy: header.updated_by,
      createdAt: header.created_at,
      updatedAt: header.updated_at,
    });
  }

  /**
   * Generate a PR number `PR-{outletCode}-YYYY-NNNNNN`, per company, per year,
   * per destination outlet code. Serial is derived from the current max serial
   * for that (company, outlet-code, year) prefix. Called inside the create
   * transaction with the row-space effectively serialised by the surrounding
   * transaction; a duplicate would still be caught by the partial unique index.
   */
  private async _generateNumber(
    client: PoolClient,
    companyId: string,
    outletCode: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PR-${outletCode}-${year}-`;
    const result = await client.query<{ max_serial: string | null }>(
      `SELECT MAX(CAST(RIGHT(pr_number, 6) AS INTEGER)) AS max_serial
       FROM purchase_requests
       WHERE company_id = $1 AND pr_number LIKE $2`,
      [companyId, `${prefix}%`],
    );
    const current = result.rows[0]?.max_serial ? parseInt(result.rows[0].max_serial, 10) : 0;
    const seq = current + 1;
    return `${prefix}${String(seq).padStart(6, '0')}`;
  }

  private async _loadItems(client: PoolClient, prId: string): Promise<ItemRow[]> {
    const result = await client.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_request_items
       WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
      [prId],
    );
    return result.rows;
  }

  private async _loadLogs(client: PoolClient, prId: string): Promise<LogRow[]> {
    const result = await client.query<LogRow>(
      `SELECT ${LOG_COLUMNS} FROM purchase_request_status_logs
       WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
      [prId],
    );
    return result.rows;
  }

  private async _insertItems(
    client: PoolClient,
    prId: string,
    items: NewPurchaseRequestData['items'],
  ): Promise<void> {
    for (const item of items) {
      await client.query(
        `INSERT INTO purchase_request_items
           (purchase_request_id, product_id, quantity, uom_id, estimated_price, subtotal)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [prId, item.productId, item.quantity, item.uomId, item.estimatedPrice, item.subtotal],
      );
    }
  }

  private async _insertLog(
    client: PoolClient,
    prId: string,
    fromStatus: PurchaseRequestStatus | null,
    toStatus: PurchaseRequestStatus,
    actorId: string | null,
    note: string | null,
  ): Promise<void> {
    await client.query(
      `INSERT INTO purchase_request_status_logs
         (purchase_request_id, from_status, to_status, actor_id, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [prId, fromStatus, toStatus, actorId, note],
    );
  }

  private async _resolveOutletCode(client: PoolClient, outletId: string, companyId: string): Promise<string> {
    const result = await client.query<{ code: string }>(
      `SELECT code FROM outlets WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [outletId, companyId],
    );
    if (!result.rowCount) {
      throw new NotFoundError('OUTLET.NOT_FOUND');
    }
    return result.rows[0].code;
  }

  async createDraft(
    companyId: string,
    userId: string | null,
    data: NewPurchaseRequestData,
  ): Promise<PurchaseRequest> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const outletCode = await this._resolveOutletCode(client, data.destinationOutletId, companyId);
      const number = await this._generateNumber(client, companyId, outletCode);

      const headerResult = await client.query<HeaderRow>(
        `INSERT INTO purchase_requests
           (company_id, pr_number, requestor_id, destination_outlet_id, expected_date,
            total_estimated_amount, status, notes, created_by)
         VALUES ($1,$2,$3,$4,$5::date,$6,'DRAFT',$7,$8)
         RETURNING ${HEADER_COLUMNS}`,
        [
          companyId,
          number,
          userId,
          data.destinationOutletId,
          data.expectedDate,
          data.totalEstimatedAmount,
          data.notes,
          userId,
        ],
      );
      const header = headerResult.rows[0];

      await this._insertItems(client, header.id, data.items);
      await this._insertLog(client, header.id, null, 'DRAFT', userId, null);

      const items = await this._loadItems(client, header.id);
      const logs = await this._loadLogs(client, header.id);
      await client.query('COMMIT');
      return this._toPurchaseRequest(header, items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async updateDraft(
    id: string,
    companyId: string,
    userId: string | null,
    data: NewPurchaseRequestData,
  ): Promise<PurchaseRequest> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_requests
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_REQUEST.NOT_FOUND');
      }
      const current = headerResult.rows[0].status as PurchaseRequestStatus;
      if (!isEditableStatus(current)) {
        throw new InvariantError('PURCHASE_REQUEST.ONLY_EDITABLE_STATUS');
      }

      // Editing always lands the document back in DRAFT; if it was REJECTED,
      // record the REJECTED -> DRAFT transition on the timeline.
      const updatedHeader = await client.query<HeaderRow>(
        `UPDATE purchase_requests
         SET destination_outlet_id = $1, expected_date = $2::date, notes = $3,
             total_estimated_amount = $4, status = 'DRAFT', updated_by = $5, updated_at = NOW()
         WHERE id = $6 AND company_id = $7
         RETURNING ${HEADER_COLUMNS}`,
        [
          data.destinationOutletId,
          data.expectedDate,
          data.notes,
          data.totalEstimatedAmount,
          userId,
          id,
          companyId,
        ],
      );

      await client.query(`DELETE FROM purchase_request_items WHERE purchase_request_id = $1`, [id]);
      await this._insertItems(client, id, data.items);

      if (current === 'REJECTED') {
        await this._insertLog(client, id, 'REJECTED', 'DRAFT', userId, 'Diperbarui dan dikembalikan ke draft');
      }

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseRequest(updatedHeader.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw this._translateConflict(err);
    } finally {
      client.release();
    }
  }

  async getById(id: string, companyId: string): Promise<PurchaseRequest> {
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_requests
       WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL`,
      [id, companyId],
    );
    if (!headerResult.rowCount) {
      throw new NotFoundError('PURCHASE_REQUEST.NOT_FOUND');
    }
    const itemsResult = await this.pool.query<ItemRow>(
      `SELECT ${ITEM_COLUMNS} FROM purchase_request_items
       WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
      [id],
    );
    const logsResult = await this.pool.query<LogRow>(
      `SELECT ${LOG_COLUMNS} FROM purchase_request_status_logs
       WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
      [id],
    );
    return this._toPurchaseRequest(headerResult.rows[0], itemsResult.rows, logsResult.rows);
  }

  async list(
    companyId: string,
    filter: PurchaseRequestListFilter,
  ): Promise<PurchaseRequestListResult> {
    const conditions: string[] = ['company_id = $1', 'deleted_at IS NULL'];
    const params: unknown[] = [companyId];

    if (filter.status) {
      params.push(filter.status);
      conditions.push(`status = $${params.length}`);
    }
    if (filter.destinationOutletId) {
      params.push(filter.destinationOutletId);
      conditions.push(`destination_outlet_id = $${params.length}`);
    }
    if (filter.search) {
      params.push(`%${filter.search}%`);
      conditions.push(`(pr_number ILIKE $${params.length} OR notes ILIKE $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM purchase_requests WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(filter.limit, filter.offset);
    const headerResult = await this.pool.query<HeaderRow>(
      `SELECT ${HEADER_COLUMNS} FROM purchase_requests
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    const rows: PurchaseRequest[] = [];
    for (const header of headerResult.rows) {
      const itemsResult = await this.pool.query<ItemRow>(
        `SELECT ${ITEM_COLUMNS} FROM purchase_request_items
         WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
        [header.id],
      );
      const logsResult = await this.pool.query<LogRow>(
        `SELECT ${LOG_COLUMNS} FROM purchase_request_status_logs
         WHERE purchase_request_id = $1 ORDER BY created_at ASC, id ASC`,
        [header.id],
      );
      rows.push(this._toPurchaseRequest(header, itemsResult.rows, logsResult.rows));
    }

    return { rows, total };
  }

  /**
   * Generic guarded status transition + timeline log. Loads the header FOR
   * UPDATE, verifies canTransition, applies the extra column sets, writes a log
   * row, commits — all atomically.
   */
  private async _transition(
    id: string,
    companyId: string,
    userId: string | null,
    to: PurchaseRequestStatus,
    note: string | null,
    extraSets: string[] = [],
    softDelete = false,
  ): Promise<PurchaseRequest> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const headerResult = await client.query<HeaderRow>(
        `SELECT ${HEADER_COLUMNS} FROM purchase_requests
         WHERE id = $1 AND company_id = $2 AND deleted_at IS NULL FOR UPDATE`,
        [id, companyId],
      );
      if (!headerResult.rowCount) {
        throw new NotFoundError('PURCHASE_REQUEST.NOT_FOUND');
      }
      const from = headerResult.rows[0].status as PurchaseRequestStatus;
      if (!canTransition(from, to)) {
        throw new InvariantError('PURCHASE_REQUEST.INVALID_STATUS_TRANSITION');
      }

      const sets = ['status = $1', 'updated_by = $2', 'updated_at = NOW()', ...extraSets];
      if (softDelete) {
        sets.push('deleted_at = NOW()', 'deleted_by = $2');
      }

      const updated = await client.query<HeaderRow>(
        `UPDATE purchase_requests SET ${sets.join(', ')}
         WHERE id = $3 AND company_id = $4
         RETURNING ${HEADER_COLUMNS}`,
        [to, userId, id, companyId],
      );

      await this._insertLog(client, id, from, to, userId, note);

      const items = await this._loadItems(client, id);
      const logs = await this._loadLogs(client, id);
      await client.query('COMMIT');
      return this._toPurchaseRequest(updated.rows[0], items, logs);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async submit(id: string, companyId: string, userId: string | null): Promise<PurchaseRequest> {
    return this._transition(id, companyId, userId, 'SUBMITTED', null);
  }

  async approve(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    return this._transition(id, companyId, userId, 'APPROVED', note, [
      'approved_by = $2',
      'approved_at = NOW()',
    ]);
  }

  async reject(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    return this._transition(id, companyId, userId, 'REJECTED', note);
  }

  async cancel(
    id: string,
    companyId: string,
    userId: string | null,
    note: string | null,
  ): Promise<PurchaseRequest> {
    return this._transition(id, companyId, userId, 'CANCELLED', note, [], true);
  }

  /** Map a unique-violation on pr_number to a friendly conflict. */
  private _translateConflict(err: unknown): unknown {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return new InvariantError('PURCHASE_REQUEST.NUMBER_ALREADY_USED');
    }
    return err;
  }
}
