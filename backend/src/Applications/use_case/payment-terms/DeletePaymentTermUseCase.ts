import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';

/**
 * UseCase: DeletePaymentTermUseCase
 * Soft-deletes a payment term, blocking when it is still referenced by active
 * records (409). No module references payment terms yet, so the dependency
 * count is currently always 0; the guard is kept for forward compatibility.
 */
export class DeletePaymentTermUseCase {
  constructor(private readonly paymentTermRepository: PaymentTermRepository) {}

  async execute(id: string, companyId: string): Promise<void> {
    await this.paymentTermRepository.getPaymentTermById(id, companyId);

    const dependents = await this.paymentTermRepository.countActiveDependents(id, companyId);
    if (dependents > 0) {
      throw new Error('PAYMENT_TERM.IN_USE');
    }

    await this.paymentTermRepository.softDeletePaymentTerm(id, companyId);
  }
}
