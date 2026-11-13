import { ProductType } from '../../../Domains/product-types/entities/ProductType';
import { UpdateProductType } from '../../../Domains/product-types/entities/UpdateProductType';
import { ProductTypeRepository } from '../../../Domains/product-types/ProductTypeRepository';

/** UseCase: validate the partial payload and update a product type by code. */
export class UpdateProductTypeUseCase {
  constructor(private readonly productTypeRepository: ProductTypeRepository) {}

  async execute(code: string, payload: unknown): Promise<ProductType> {
    const entity = new UpdateProductType(payload);
    return this.productTypeRepository.updateProductType(code, entity.fields);
  }
}
