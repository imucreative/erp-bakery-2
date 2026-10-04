import { PurchaseReturnComment } from '../../../Domains/purchase-returns/entities/PurchaseReturnComment';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';

/**
 * UseCase: GetPurchaseReturnCommentsUseCase — list a Purchase Return discussion
 * thread chronologically. Enforces tenant scope (the return must belong to the
 * caller's company) before returning the thread.
 */
export class GetPurchaseReturnCommentsUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async execute(
    purchaseReturnId: string,
    companyId: string,
  ): Promise<PurchaseReturnComment[]> {
    await this.purchaseReturnRepository.ensureExists(purchaseReturnId, companyId);
    return this.purchaseReturnRepository.listComments(purchaseReturnId, companyId);
  }
}
