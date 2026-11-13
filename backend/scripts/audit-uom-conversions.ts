/**
 * Audit UOM global-conversion readiness (doc 52, B2).
 *
 * Run AFTER migration 077 (dimension + factor_to_canonical) and BEFORE 078
 * (drop product_uom_conversions). It reports:
 *   1. UOMs missing dimension/factor metadata.
 *   2. Per-product conversion rows that do not agree with the global formula.
 *
 * Exit code 1 only when per-product conversion rows conflict/unresolved. UOMs
 * without metadata are reported as warnings: they do not block migration 078
 * unless a legacy conversion row actually depends on them.
 */
import 'dotenv/config';
import pool from '../src/Infrastructures/database/pool';

interface UomRow {
  id: string;
  code: string;
  name: string;
  dimension: string | null;
  factor_to_canonical: string | null;
}

interface ConflictRow {
  id: string;
  sku: string;
  base_code: string | null;
  alt_code: string | null;
  factor_to_base: string;
  base_dimension: string | null;
  base_factor: string | null;
  alt_dimension: string | null;
  alt_factor: string | null;
}

async function main(): Promise<void> {
  const columns = await pool.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'uoms'
        AND column_name IN ('dimension', 'factor_to_canonical')`,
  );
  if (columns.rowCount !== 2) {
    console.error(
      'UOM metadata columns belum ada. Jalankan migrasi 077 terlebih dahulu.',
    );
    process.exitCode = 1;
    return;
  }

  const missing = await pool.query<UomRow>(
    `SELECT id, code, name, dimension, factor_to_canonical
       FROM uoms
      WHERE deleted_at IS NULL
        AND (dimension IS NULL OR factor_to_canonical IS NULL)
      ORDER BY code ASC`,
  );

  console.log(`UOM tanpa metadata: ${missing.rowCount ?? 0}`);
  for (const row of missing.rows) {
    console.log(
      `  - ${row.code} (${row.name}): dimension=${row.dimension ?? 'NULL'}, factor=${row.factor_to_canonical ?? 'NULL'}`,
    );
  }

  const table = await pool.query<{ t: string | null }>(
    `SELECT to_regclass('public.product_uom_conversions') AS t`,
  );
  if (!table.rows[0]?.t) {
    console.log('product_uom_conversions sudah tidak ada (migrasi 078 sudah jalan).');
    return;
  }

  const conflicts = await pool.query<ConflictRow>(
    `SELECT c.id,
            p.sku,
            base.code AS base_code,
            alt.code AS alt_code,
            c.factor_to_base,
            base.dimension AS base_dimension,
            base.factor_to_canonical AS base_factor,
            alt.dimension AS alt_dimension,
            alt.factor_to_canonical AS alt_factor
       FROM product_uom_conversions c
       JOIN products p ON p.id = c.product_id
       LEFT JOIN uoms base ON base.id = p.uom_id
       LEFT JOIN uoms alt ON alt.id = c.uom_id
      WHERE base.id IS NULL
         OR alt.id IS NULL
         OR base.dimension IS NULL
         OR base.factor_to_canonical IS NULL
         OR alt.dimension IS NULL
         OR alt.factor_to_canonical IS NULL
         OR base.dimension <> alt.dimension
         OR ABS((alt.factor_to_canonical / base.factor_to_canonical) - c.factor_to_base) > 0.000001
      ORDER BY p.sku ASC, c.id ASC`,
  );

  console.log(`Baris product_uom_conversions bermasalah: ${conflicts.rowCount ?? 0}`);
  for (const row of conflicts.rows) {
    console.log(
      `  - ${row.sku}: ${row.alt_code ?? '?'} -> ${row.base_code ?? '?'}, ` +
        `factor=${row.factor_to_base}, base=${row.base_dimension ?? 'NULL'}/${row.base_factor ?? 'NULL'}, ` +
        `alt=${row.alt_dimension ?? 'NULL'}/${row.alt_factor ?? 'NULL'}`,
    );
  }

  if ((conflicts.rowCount ?? 0) > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error('Audit gagal:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
