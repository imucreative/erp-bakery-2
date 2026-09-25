import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: DeleteUomUseCase
 * Soft-deletes a UOM, blocking when it is still referenced by active products (409).
 */
export class DeleteUomUseCase {
  constructor(private readonly uomRepository: UomRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.uomRepository.getUomById(id, companyId);

    const dependents = await this.uomRepository.countActiveDependents(id, companyId);
    if (dependents > 0) {
      throw new Error('UOM.IN_USE');
    }

    await this.uomRepository.softDeleteUom(id, companyId);
  }
}
