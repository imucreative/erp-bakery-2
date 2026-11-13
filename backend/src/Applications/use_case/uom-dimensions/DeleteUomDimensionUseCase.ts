import { UomDimensionRepository } from '../../../Domains/uom-dimensions/UomDimensionRepository';

/**
 * UseCase: DeleteUomDimensionUseCase
 * Hard-delete; the repository rejects it with 409 while any UOM still uses
 * the dimension code.
 */
export class DeleteUomDimensionUseCase {
  constructor(private readonly uomDimensionRepository: UomDimensionRepository) {}

  async execute(code: string): Promise<void> {
    await this.uomDimensionRepository.deleteDimension(code);
  }
}
