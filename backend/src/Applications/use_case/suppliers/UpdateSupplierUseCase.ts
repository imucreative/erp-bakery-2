import { Supplier } from '../../../Domains/suppliers/entities/Supplier';
import { UpdateSupplier } from '../../../Domains/suppliers/entities/UpdateSupplier';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';

/**
 * UseCase: UpdateSupplierUseCase
 * Validates the partial payload; blocks deactivation when the supplier is still
 * referenced by active products (master-data dependency protection → 409).
 */
export class UpdateSupplierUseCase {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Supplier> {
    const updateSupplier = new UpdateSupplier(payload);

    if (updateSupplier.fields.isActive === false) {
      const dependents = await this.supplierRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('SUPPLIER.IN_USE');
      }
    }

    return this.supplierRepository.updateSupplier(id, companyId, updateSupplier.fields);
  }
}
