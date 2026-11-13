import { CreateUomDimension } from '../../../Domains/uom-dimensions/entities/CreateUomDimension';
import { UomDimensionDefinition } from '../../../Domains/uom-dimensions/entities/UomDimensionDefinition';
import { UomDimensionRepository } from '../../../Domains/uom-dimensions/UomDimensionRepository';

/**
 * UseCase: CreateUomDimensionUseCase
 * Validates the payload, then persists the dimension together with its
 * canonical (smallest) UOM row for the current company.
 */
export class CreateUomDimensionUseCase {
  constructor(private readonly uomDimensionRepository: UomDimensionRepository) {}

  async execute(payload: unknown, companyId: string): Promise<UomDimensionDefinition> {
    const createDimension = new CreateUomDimension(payload);
    return this.uomDimensionRepository.addDimension(
      {
        code: createDimension.code,
        name: createDimension.name,
        canonicalUnitName: createDimension.canonicalUnitName,
        canonicalUnitSymbol: createDimension.canonicalUnitSymbol,
        isActive: createDimension.isActive,
      },
      companyId,
    );
  }
}
