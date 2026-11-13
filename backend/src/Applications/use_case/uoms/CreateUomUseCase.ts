import { CreateUom } from '../../../Domains/uoms/entities/CreateUom';
import { Uom } from '../../../Domains/uoms/entities/Uom';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: CreateUomUseCase
 * 1. Validate & normalise input
 * 2. Use the client-supplied code, or generate one (UOM-###) when blank
 * 3. Persist.
 */
export class CreateUomUseCase {
  constructor(private readonly uomRepository: UomRepository) {}

  async execute(payload: unknown, companyId: string): Promise<Uom> {
    const createUom = new CreateUom(payload);
    const code = createUom.code ?? (await this.uomRepository.generateUomCode(companyId));
    return this.uomRepository.addUom(
      {
        code,
        name: createUom.name,
        dimension: createUom.dimension,
        factorToCanonical: createUom.factorToCanonical,
      },
      companyId,
    );
  }
}
