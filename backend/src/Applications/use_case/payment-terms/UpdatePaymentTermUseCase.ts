import { PaymentTerm } from '../../../Domains/payment-terms/entities/PaymentTerm';
import { UpdatePaymentTerm } from '../../../Domains/payment-terms/entities/UpdatePaymentTerm';
import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';

/**
 * UseCase: UpdatePaymentTermUseCase
 * Validates the partial payload (code is immutable, so not updatable); blocks
 * deactivation when the payment term is still referenced by active records
 * (master-data dependency protection → 409).
 */
export class UpdatePaymentTermUseCase {
  constructor(private readonly paymentTermRepository: PaymentTermRepository) {}

  async execute(id: string, payload: unknown, companyId: string): Promise<PaymentTerm> {
    const updatePaymentTerm = new UpdatePaymentTerm(payload);

    if (updatePaymentTerm.fields.isActive === false) {
      const dependents = await this.paymentTermRepository.countActiveDependents(id, companyId);
      if (dependents > 0) {
        throw new Error('PAYMENT_TERM.IN_USE');
      }
    }

    return this.paymentTermRepository.updatePaymentTerm(id, companyId, updatePaymentTerm.fields);
  }
}
