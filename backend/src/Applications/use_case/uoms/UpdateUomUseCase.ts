import { Uom } from '../../../Domains/uoms/entities/Uom';
import { UpdateUom } from '../../../Domains/uoms/entities/UpdateUom';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: UpdateUomUseCase
 * Validates the partial payload; blocks deactivation when the UOM is still
 * referenced by active products (master-data dependency protection → 409).
 */
export class UpdateUomUseCase {
  constructor(private readonly uomRepository: UomRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Uom> {
    const updateUom = new UpdateUom(payload);

    if (updateUom.fields.isActive === false) {
      const dependents = await this.uomRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('UOM.IN_USE');
      }
    }

    return this.uomRepository.updateUom(id, companyId, updateUom.fields);
  }
}
