import { PoolClient } from 'pg';
import { normalizeLotKey } from '../../../Domains/inventory/entities/InventoryBatch';
import { MovementType, isInboundMovement } from '../../../Domains/inventory/movementTypes';
import { NotFoundError } from '../../../Commons/exceptions/NotFoundError';
import { InvariantError } from '../../../Commons/exceptions/InvariantError';

/**
 * Shared inventory ledger primitives.
 *
 * This module is the SINGLE SOURCE OF TRUTH for the two guarantees every stock
 * mutation in the system must satisfy (inventory-domain rules #2, #5, #6, #9):
 *   - concurrency safety: the target batch row is locked FOR UPDATE and the
 *     before/after balance is derived under that lock;
 *   - negative-stock ban: an outbound movement may not drive qty below zero;
 *   - atomic ledger append: the inventory_batches balance change and the
 *     inventory_movements row are written together, inside the caller's
 *     transaction (the caller owns BEGIN/COMMIT/ROLLBACK + isolation level);
 *   - source-key idempotency: a duplicate source key raises 23505, which the
 *     caller translates via {@link translateDuplicateSourceKey}.
 *
 * Both `InventoryRepositoryPostgres.postMovements` (existing drafts against
 * known batches) and `GoodsReceiptRepositoryPostgres.complete` (resolve-or-
 * create a batch, then post a PURCHASE inbound) call these helpers so the
 * ledger write path is identical and never diverges. All functions take the
 * caller's transaction `client`; none of them manage transaction boundaries.
 */

const MOVEMENT_INSERT_COLUMNS = `id, company_id, outlet_id, batch_id, product_id, movement_type, qty, before_qty, after_qty, source_document_type, source_document_id, source_document_item_id, source_document_allocation_id, notes, user_id, created_at`;

/** Row shape returned by the ledger INSERT (same columns the repos map). */
export interface PostedMovementRow {
  id: string;
  company_id: string;
  outlet_id: string;
  batch_id: string;
  product_id: string;
  movement_type: string;
  qty: string;
  before_qty: string;
  after_qty: string;
  source_document_type: string | null;
  source_document_id: string | null;
  notes: string | null;
  user_id: string | null;
  created_at: Date;
}

/** Deterministic source key for a ledger row (idempotency, rule #5). */
export interface MovementSourceKey {
  sourceDocumentType?: string | null;
  sourceDocumentId?: string | null;
  sourceDocumentItemId?: string | null;
  sourceDocumentAllocationId?: string | null;
}

/** A single balance-mutate + ledger-append instruction against a known batch. */
export interface LedgerPostInput extends MovementSourceKey {
  companyId: string;
  outletId: string;
  batchId: string;
  productId: string;
  movementType: MovementType;
  /** Positive magnitude; direction is implied by movementType. */
  qty: number;
  notes?: string | null;
  userId?: string | null;
}

/** Identity + attributes needed to resolve-or-create a batch before posting. */
export interface ResolveBatchInput {
  companyId: string;
  outletId: string;
  productId: string;
  /** '' sentinel for non-batch products. */
  batchNumber: string;
  /** Raw lot number (nullable); normalised to lotKey here. */
  lotNumber: string | null;
  /** Expiry for batch-tracked lines; null for non-batch synthetic rows. */
  expiryDate: Date | null;
  /** received_date on a newly created batch (date-only). */
  receivedDate: Date;
  /** TRUE → synthetic non-batch row. */
  isNonBatch: boolean;
}

/**
 * Resolve the target batch by identity (company + outlet + product +
 * batchNumber + lotKey), creating it when absent. When it exists it is locked
 * FOR UPDATE (concurrency safety, rule #6). Returns the batch id and its
 * current balance so the caller can derive the authoritative before/after.
 *
 * A newly created batch starts ACTIVE at qty 0; a previously CONSUMED batch is
 * re-activated by the subsequent balance update. Expiry is stored as a date-only
 * string (null for non-batch synthetic rows — requires expired_date NULLABLE,
 * migration 043).
 */
export async function resolveOrCreateBatch(
  client: PoolClient,
  input: ResolveBatchInput,
): Promise<{ batchId: string; beforeQty: number; created: boolean }> {
  const lotKey = normalizeLotKey(input.lotNumber);
  const expiry = input.expiryDate ? input.expiryDate.toISOString().slice(0, 10) : null;
  const receivedDate = input.receivedDate.toISOString().slice(0, 10);

  const existing = await client.query<{ id: string; qty_available: string }>(
    `SELECT id, qty_available FROM inventory_batches
     WHERE company_id = $1 AND outlet_id = $2 AND product_id = $3
       AND batch_number = $4 AND lot_key = $5
     FOR UPDATE`,
    [input.companyId, input.outletId, input.productId, input.batchNumber, lotKey],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    return {
      batchId: existing.rows[0].id,
      beforeQty: Number(existing.rows[0].qty_available),
      created: false,
    };
  }

  const inserted = await client.query<{ id: string }>(
    `INSERT INTO inventory_batches
       (company_id, outlet_id, product_id, batch_number, lot_key, lot_number,
        expired_date, received_date, qty_available, status, is_non_batch)
     VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::date,0,'ACTIVE',$9)
     RETURNING id`,
    [
      input.companyId,
      input.outletId,
      input.productId,
      input.batchNumber,
      lotKey,
      input.lotNumber,
      expiry,
      receivedDate,
      input.isNonBatch,
    ],
  );

  return { batchId: inserted.rows[0].id, beforeQty: 0, created: true };
}

/**
 * Mutate a batch balance and append the matching immutable ledger row, inside
 * the caller's transaction. The caller MUST already hold the batch row lock
 * (either via {@link resolveOrCreateBatch} or its own `SELECT ... FOR UPDATE`)
 * and pass the balance it read under that lock as `beforeQty`.
 *
 * Enforces the negative-stock ban (rule #2), flips a drained batch to CONSUMED,
 * re-activates a batch on an inbound movement, and writes before/after snapshots
 * on the ledger row (rule #9). Returns the inserted movement row.
 */
export async function applyBalanceAndAppendMovement(
  client: PoolClient,
  input: LedgerPostInput,
  beforeQty: number,
): Promise<PostedMovementRow> {
  const delta = isInboundMovement(input.movementType) ? input.qty : -input.qty;
  const afterQty = beforeQty + delta;

  if (afterQty < 0) {
    throw new InvariantError('INVENTORY.INSUFFICIENT_STOCK');
  }

  // Authoritative balance update. Inbound re-activates a drained batch;
  // reaching zero marks it CONSUMED.
  await client.query(
    `UPDATE inventory_batches
     SET qty_available = $1::numeric,
         status = CASE
           WHEN $1::numeric = 0 THEN 'CONSUMED'
           WHEN $2 THEN 'ACTIVE'
           ELSE status
         END,
         updated_at = NOW()
     WHERE id = $3 AND company_id = $4`,
    [afterQty, isInboundMovement(input.movementType), input.batchId, input.companyId],
  );

  // Immutable ledger append carrying the deterministic source key. A duplicate
  // key raises 23505 (translated by translateDuplicateSourceKey).
  const movement = await client.query<PostedMovementRow>(
    `INSERT INTO inventory_movements (
       company_id, outlet_id, batch_id, product_id, movement_type,
       qty, before_qty, after_qty,
       source_document_type, source_document_id,
       source_document_item_id, source_document_allocation_id,
       notes, user_id
     )
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING ${MOVEMENT_INSERT_COLUMNS}`,
    [
      input.companyId,
      input.outletId,
      input.batchId,
      input.productId,
      input.movementType,
      input.qty,
      beforeQty,
      afterQty,
      input.sourceDocumentType ?? null,
      input.sourceDocumentId ?? null,
      input.sourceDocumentItemId ?? null,
      input.sourceDocumentAllocationId ?? null,
      input.notes ?? null,
      input.userId ?? null,
    ],
  );

  return movement.rows[0];
}

/**
 * Translate a Postgres unique-violation (23505) raised by the source-key index
 * into the domain idempotency error. Other errors pass through unchanged. Call
 * this from the caller's catch block (the caller still owns ROLLBACK).
 */
export function translateDuplicateSourceKey(err: unknown): unknown {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  ) {
    return new InvariantError('INVENTORY.DUPLICATE_MOVEMENT_SOURCE');
  }
  return err;
}

/** Re-export so callers can keep NotFoundError semantics on a missing batch. */
export { NotFoundError };
