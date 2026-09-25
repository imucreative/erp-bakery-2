import { CreateProductGroup } from '../../../Domains/product-groups/entities/CreateProductGroup';
import { ProductGroup } from '../../../Domains/product-groups/entities/ProductGroup';
import { ProductGroupRepository } from '../../../Domains/product-groups/ProductGroupRepository';

/**
 * UseCase: CreateProductGroupUseCase
 *
 * 1. Validate & normalise input (via CreateProductGroup domain entity)
 * 2. Generate the next code scoped to the company (PG-###)
 * 3. Persist within the company tenant
 */
export class CreateProductGroupUseCase {
  constructor(private readonly productGroupRepository: ProductGroupRepository) {}

  async execute(payload: unknown, companyId: string): Promise<ProductGroup> {
    const createProductGroup = new CreateProductGroup(payload);

    const code = await this.productGroupRepository.generateProductGroupCode(companyId);

    return this.productGroupRepository.addProductGroup(
      {
        code,
        name: createProductGroup.name,
        description: createProductGroup.description,
      },
      companyId,
    );
  }
}
