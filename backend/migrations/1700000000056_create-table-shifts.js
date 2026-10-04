/* eslint-disable camelcase */

/**
 * Migration: shifts (POS / Sales — Fase 1, doc 51 §4.2 & §6.2)
 *
 * Cashier shift ledger. Lifecycle: OPEN -> CLOSED (doc 51 §6.2).
 *   OPEN captures opening_cash; CLOSED records the cash reconciliation
 *   (expected_cash, actual_cash, discrepancy).
 *
 * Company-scoped + outlet-scoped (doc 35 §3.1).
 *
 * Invariant (doc 51 §4.2): at most ONE OPEN shift per (cashier_user_id, outlet_id)
 * — enforced by a PARTIAL UNIQUE INDEX WHERE status = 'OPEN'. This makes the
 * race-safe open-shift path rely on the DB (23505 -> SHIFT.ALREADY_OPEN) rather
 * than an application-level pre-check.
 *
 * expected_cash scope (Fase 1): Fase 1 has NO sales/payment tables yet, so close
 * sets expected_cash = opening_cash (no cash transactions to add). The actual_cash
 * is supplied manually at close and discrepancy = actual_cash - expected_cash.
 *   >> Fase 2 (doc 51 §4.2, OQ-8): expected_cash will be computed as
 *      opening_cash + Σ(payment CASH) - Σ(refund CASH); non-cash methods never
 *      affect drawer reconciliation. close-shift will be updated at that point.
 */
exports.up = (pgm) => {
  pgm.createTable('shifts', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    company_id: {
      type: 'UUID',
      notNull: true,
      references: '"companies"',
      onDelete: 'CASCADE',
    },
    outlet_id: {
      type: 'UUID',
      notNull: true,
      references: '"outlets"',
      onDelete: 'RESTRICT',
    },
    cashier_user_id: {
      type: 'UUID',
      notNull: true,
      references: '"users"',
      onDelete: 'RESTRICT',
    },
    opened_at: {
      type: 'TIMESTAMP',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    closed_at: {
      type: 'TIMESTAMP',
      notNull: false,
    },
    opening_cash: {
      type: 'NUMERIC(18,2)',
      notNull: true,
      default: 0,
    },
    // Filled on close. Fase 1: = opening_cash (no CASH payments yet).
    expected_cash: {
      type: 'NUMERIC(18,2)',
      notNull: false,
    },
    // Manual input at close (physical drawer count).
    actual_cash: {
      type: 'NUMERIC(18,2)',
      notNull: false,
    },
    // = actual_cash - expected_cash (computed on close).
    discrepancy: {
      type: 'NUMERIC(18,2)',
      notNull: false,
    },
    status: {
      type: 'VARCHAR(10)',
      notNull: true,
      default: 'OPEN',
    },
    notes: {
      type: 'TEXT',
      notNull: false,
    },
    // Audit fields (doc 35 §4)
    created_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    updated_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    closed_by: { type: 'UUID', notNull: false, references: '"users"', onDelete: 'SET NULL' },
    created_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
    updated_at: { type: 'TIMESTAMP', notNull: true, default: pgm.func('NOW()') },
  });

  pgm.addConstraint(
    'shifts',
    'shifts_status_check',
    "CHECK (status IN ('OPEN','CLOSED'))",
  );

  // Invariant: at most one OPEN shift per (cashier, outlet) — doc 51 §4.2.
  pgm.createIndex('shifts', ['cashier_user_id', 'outlet_id'], {
    unique: true,
    name: 'shifts_one_open_per_cashier_outlet',
    where: "status = 'OPEN'",
  });

  pgm.createIndex('shifts', 'company_id');
  pgm.createIndex('shifts', 'outlet_id');
  pgm.createIndex('shifts', 'cashier_user_id');
  pgm.createIndex('shifts', 'status');
  pgm.createIndex('shifts', 'created_at');
};

exports.down = (pgm) => {
  pgm.dropTable('shifts');
};
