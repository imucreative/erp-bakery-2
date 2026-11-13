/**
 * Domain Entity: UomDimensionDefinition
 *
 * Global reference row describing a physical dimension and its canonical
 * (smallest) unit. `uoms.dimension` stores `code`; factors are measured
 * relative to `canonicalUnitName`.
 */
export class UomDimensionDefinition {
  public readonly code: string;
  public readonly name: string;
  public readonly canonicalUnitName: string;
  public readonly canonicalUnitSymbol: string;
  public readonly isActive: boolean;

  constructor(payload: {
    code: string;
    name: string;
    canonicalUnitName: string;
    canonicalUnitSymbol: string;
    isActive: boolean;
  }) {
    this.code = payload.code;
    this.name = payload.name;
    this.canonicalUnitName = payload.canonicalUnitName;
    this.canonicalUnitSymbol = payload.canonicalUnitSymbol;
    this.isActive = payload.isActive;
  }
}
