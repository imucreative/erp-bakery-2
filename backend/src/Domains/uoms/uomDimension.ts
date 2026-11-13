/**
 * UOM dimensions are reference data (`uom_dimensions`), not a closed enum:
 * admins may add dimensions such as LENGTH together with their canonical unit.
 * A UOM row stores the dimension code and is linked by FK `uoms_dimension_fk`.
 */
export const UOM_DIMENSION_CODE_PATTERN = /^[A-Z][A-Z0-9_]{0,19}$/;

export type UomDimension = string;
