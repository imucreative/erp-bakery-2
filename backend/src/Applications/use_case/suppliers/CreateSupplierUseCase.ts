import { CreateSupplier } from '../../../Domains/suppliers/entities/CreateSupplier';
import { Supplier } from '../../../Domains/suppliers/entities/Supplier';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';

/**
 * UseCase: CreateSupplierUseCase
 * 1. Validate & normalise input  2. Generate code (SUP-###)  3. Persist.
 */
export class CreateSupplierUseCase {
  constructor(private readonly supplierRepository: SupplierRepository) {}

  async execute(payload: unknown, companyId: string): Promise<Supplier> {
    const createSupplier = new CreateSupplier(payload);
    const code = await this.supplierRepository.generateSupplierCode(companyId);
    return this.supplierRepository.addSupplier(
      {
        code,
        name: createSupplier.name,
        address: createSupplier.address,
        phone: createSupplier.phone,
        picName: createSupplier.picName,
      },
      companyId,
    );
  }
}
