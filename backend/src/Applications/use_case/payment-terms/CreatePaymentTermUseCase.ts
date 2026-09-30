import { CreatePaymentTerm } from '../../../Domains/payment-terms/entities/CreatePaymentTerm';
import { PaymentTerm } from '../../../Domains/payment-terms/entities/PaymentTerm';
import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';

/**
 * UseCase: CreatePaymentTermUseCase
 * 1. Validate & normalise input (code → trim + uppercase, dueDays ≥ 0)
 * 2. Ensure code is unique within the company (409 on conflict)
 * 3. Persist within the company tenant
 */
export class CreatePaymentTermUseCase {
  constructor(private readonly paymentTermRepository: PaymentTermRepository) {}

  async execute(payload: unknown, companyId: string): Promise<PaymentTerm> {
    const createPaymentTerm = new CreatePaymentTerm(payload);

    const taken = await this.paymentTermRepository.isCodeTaken(createPaymentTerm.code, companyId);
    if (taken) {
      throw new Error('PAYMENT_TERM.CODE_ALREADY_USED');
    }

    return this.paymentTermRepository.addPaymentTerm(
      {
        code: createPaymentTerm.code,
        name: createPaymentTerm.name,
        dueDays: createPaymentTerm.dueDays,
      },
      companyId,
    );
  }
}
