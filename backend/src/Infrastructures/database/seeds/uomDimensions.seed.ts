/**
 * UOM dimension reference data.
 *
 * Dimensions are global (not company-scoped), so every deployment shares the
 * same catalog. Migration 079 seeded the original three rows; this list is the
 * current source of truth and is upserted by `run-seed.ts`, so new dimensions
 * (e.g. LENGTH) also appear on a fresh server/database without manual input.
 *
 * The canonical unit named here is the smallest unit of the dimension (factor
 * 1). The matching per-company UOM row is still created when an admin adds a
 * dimension through the UI or adds the canonical unit on the UOM page.
 */
export interface UomDimensionSeedRow {
  code: string;
  name: string;
  canonicalUnitName: string;
  canonicalUnitSymbol: string;
  isActive: boolean;
}

export const UOM_DIMENSION_SEEDS: UomDimensionSeedRow[] = [
  {
    code: 'WEIGHT',
    name: 'Berat',
    canonicalUnitName: 'gram',
    canonicalUnitSymbol: 'g',
    isActive: true,
  },
  {
    code: 'VOLUME',
    name: 'Volume',
    canonicalUnitName: 'mililiter',
    canonicalUnitSymbol: 'ml',
    isActive: true,
  },
  {
    code: 'COUNT',
    name: 'Hitungan',
    canonicalUnitName: 'pcs',
    canonicalUnitSymbol: 'pcs',
    isActive: true,
  },
  {
    code: 'LENGTH',
    name: 'Panjang',
    canonicalUnitName: 'milimeter',
    canonicalUnitSymbol: 'mm',
    isActive: true,
  },
];
