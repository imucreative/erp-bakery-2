import { Supplier } from '../../../Domains/suppliers/entities/Supplier';
import { UpdateSupplier } from '../../../Domains/suppliers/entities/UpdateSupplier';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';
import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';

/**
 * UseCase: UpdateSupplierUseCase
 * - Validates the partial payload.
 * - When a default payment term is provided (non-null), confirms it exists within
 *   the company, is not soft-deleted, and is active. A null value clears it.
 * - Blocks deactivation when the supplier is still referenced by active products
 *   (master-data dependency protection → 409).
 */
export class UpdateSupplierUseCase {
  constructor(
    private readonly supplierRepository: SupplierRepository,
    private readonly paymentTermRepository: PaymentTermRepository,
  ) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<Supplier> {
    const updateSupplier = new UpdateSupplier(payload);

    if (updateSupplier.fields.defaultPaymentTermId) {
      await this._verifyActivePaymentTerm(updateSupplier.fields.defaultPaymentTermId, companyId);
    }

    if (updateSupplier.fields.isActive === false) {
      const dependents = await this.supplierRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('SUPPLIER.IN_USE');
      }
    }

    return this.supplierRepository.updateSupplier(id, companyId, updateSupplier.fields);
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
