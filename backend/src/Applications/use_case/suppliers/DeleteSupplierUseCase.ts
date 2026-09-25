import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';

/**
 * UseCase: DeleteSupplierUseCase
 * Soft-deletes a supplier, blocking when it is still referenced by active products (409).
 */
export class DeleteSupplierUseCase {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.supplierRepository.getSupplierById(id, companyId);

    const dependents = await this.supplierRepository.countActiveDependents(id, companyId);
    if (dependents > 0) {
      throw new Error('SUPPLIER.IN_USE');
    }

    await this.supplierRepository.softDeleteSupplier(id, companyId);
  }
}
