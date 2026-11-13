import { UomDimensionDefinition } from '../../../Domains/uom-dimensions/entities/UomDimensionDefinition';
import { UpdateUomDimension } from '../../../Domains/uom-dimensions/entities/UpdateUomDimension';
import { UomDimensionRepository } from '../../../Domains/uom-dimensions/UomDimensionRepository';

/**
 * UseCase: UpdateUomDimensionUseCase
 * Only display fields are updatable; code and canonical unit are immutable.
 */
export class UpdateUomDimensionUseCase {
  constructor(private readonly uomDimensionRepository: UomDimensionRepository) {}

  async execute(code: string, payload: unknown): Promise<UomDimensionDefinition> {
    const updateDimension = new UpdateUomDimension(payload);
    return this.uomDimensionRepository.updateDimension(code, updateDimension.fields);
  }
}
