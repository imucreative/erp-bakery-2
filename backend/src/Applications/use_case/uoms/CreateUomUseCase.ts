import { CreateUom } from '../../../Domains/uoms/entities/CreateUom';
import { Uom } from '../../../Domains/uoms/entities/Uom';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreateUomUseCase
 * 1. Validate & normalise input  2. Generate code (UOM-###)  3. Persist.
 */
export class CreateUomUseCase {
  constructor(private readonly uomRepository: UomRepository) {}

  async execute(payload: unknown, companyId: string): Promise<Uom> {
    const createUom = new CreateUom(payload);
    const code = await this.uomRepository.generateUomCode(companyId);
    return this.uomRepository.addUom({ code, name: createUom.name }, companyId);
  }
}
