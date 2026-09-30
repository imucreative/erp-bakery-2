import { CreateSupplier } from '../../../Domains/suppliers/entities/CreateSupplier';
import { Supplier } from '../../../Domains/suppliers/entities/Supplier';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';
import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';

/**
 * UseCase: CreateSupplierUseCase
 * 1. Validate & normalise input.
 * 2. When a default payment term is supplied, confirm it exists within the
 *    company, is not soft-deleted, and is active.
 * 3. Generate code (SUP-###) and persist.
 *
 * The default payment term is OPTIONAL — a supplier without one is valid.
 */
export class CreateSupplierUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly paymentTermRepository: PaymentTermRepository,
  ) {}

  async execute(payload: unknown, companyId: string): Promise<Supplier> {
    const createSupplier = new CreateSupplier(payload);

    if (createSupplier.defaultPaymentTermId) {
      await this._verifyActivePaymentTerm(createSupplier.defaultPaymentTermId, companyId);
    }

    const code = await this.supplierRepository.generateSupplierCode(companyId);
    return this.supplierRepository.addSupplier(
      {
        code,
        name: createSupplier.name,
        address: createSupplier.address,
        phone: createSupplier.phone,
        picName: createSupplier.picName,
        defaultPaymentTermId: createSupplier.defaultPaymentTermId,
      },
      companyId,
    );
  }

  private async _verifyActivePaymentTerm(id: string, companyId: string): Promise<void> {
    let paymentTerm;
    try {
      paymentTerm = await this.paymentTermRepository.getPaymentTermById(id, companyId);
    } catch {
      // Not found, soft-deleted, or belongs to another company.
      throw new Error('SUPPLIER.PAYMENT_TERM_NOT_FOUND');
    }
    if (!paymentTerm.isActive) {
      throw new Error('SUPPLIER.PAYMENT_TERM_INACTIVE');
    }
  }
}
