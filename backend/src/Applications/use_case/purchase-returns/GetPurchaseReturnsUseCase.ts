import {
  PurchaseReturnRepository,
  PurchaseReturnListResult,
} from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import { isPurchaseReturnStatus } from '../../../Domains/purchase-returns/returnStatus';

export interface PurchaseReturnListQuery {
  limit: number;
  offset: number;
  status?: string;
  goodsReceiptId?: string;
  supplierId?: string;
  outletId?: string;
  search?: string;
}

/**
 * UseCase: GetPurchaseReturnsUseCase — list + detail (read).
 */
export class GetPurchaseReturnsUseCase {
  constructor(private readonly purchaseReturnRepository: PurchaseReturnRepository) {}

  async list(
    query: PurchaseReturnListQuery,
    companyId: string,
  ): Promise<PurchaseReturnListResult> {
    if (query.status && !isPurchaseReturnStatus(query.status)) {
      throw new Error('PURCHASE_RETURN.INVALID_STATUS');
    }
    return this.purchaseReturnRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      goodsReceiptId: query.goodsReceiptId,
      supplierId: query.supplierId,
      outletId: query.outletId,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<PurchaseReturn> {
    return this.purchaseReturnRepository.getById(id, companyId);
  }
}
