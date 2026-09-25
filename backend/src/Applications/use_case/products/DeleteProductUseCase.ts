import { ProductRepository } from '../../../Domains/products/ProductRepository';

/**
 * UseCase: DeleteProductUseCase
 * Soft-deletes a product. Products are leaf master data (no downstream records
 * reference them yet), so deletion only requires the record to exist in the tenant.
 */
export class DeleteProductUseCase {
  constructor(private readonly productRepository: ProductRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.productRepository.getProductById(id, companyId);
    await this.productRepository.softDeleteProduct(id, companyId);
  }
}
