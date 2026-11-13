import { UomDimensionDefinition } from './entities/UomDimensionDefinition';
import { UpdateUomDimensionFields } from './entities/UpdateUomDimension';

export interface NewUomDimensionData {
  code: string;
  name: string;
  canonicalUnitName: string;
  canonicalUnitSymbol: string;
  isActive: boolean;
}

/**
 * Abstract repository interface — UOM dimension reference data.
 *
 * Dimensions are global (not company-scoped) because a physical dimension
 * means the same thing for every tenant. The canonical UOM row is created
 * per company at dimension-creation time.
 */
export abstract class UomDimensionRepository {
  /** List active dimensions ordered for form dropdowns. */
  abstract listActive(): Promise<UomDimensionDefinition[]>;

  /** List all dimensions (active + inactive) for the management page. */
  abstract listAll(): Promise<UomDimensionDefinition[]>;

  /** Get one row by code, including inactive rows. */
  abstract getByCode(code: string): Promise<UomDimensionDefinition>;

  /**
   * Persist a dimension AND its canonical (factor 1) UOM row for `companyId`
   * in one transaction, so a dimension never exists without its smallest unit.
   */
  abstract addDimension(
    data: NewUomDimensionData,
    companyId: string,
  ): Promise<UomDimensionDefinition>;

  abstract updateDimension(
    code: string,
    fields: UpdateUomDimensionFields,
  ): Promise<UomDimensionDefinition>;

  /** Hard-delete; blocked when any UOM still uses the dimension. */
  abstract deleteDimension(code: string): Promise<void>;
}
