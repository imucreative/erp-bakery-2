import { ProductType } from '../../../Domains/product-types/entities/ProductType';
import { CreateProductType } from '../../../Domains/product-types/entities/CreateProductType';
import { ProductTypeRepository } from '../../../Domains/product-types/ProductTypeRepository';

/** UseCase: validate/normalise input then persist a new product-type row. */
export class CreateProductTypeUseCase {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async execute(payload: unknown): Promise<ProductType> {
    const entity = new CreateProductType(payload);

    return this.productTypeRepository.addProductType({
      code: entity.code,
      name: entity.name,
      description: entity.description,
      sortOrder: entity.sortOrder,
      isActive: entity.isActive,
    });
  }
}
