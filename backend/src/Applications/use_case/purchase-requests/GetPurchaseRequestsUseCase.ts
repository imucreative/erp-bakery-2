import {
  PurchaseRequestRepository,
  PurchaseRequestListResult,
} from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { PurchaseRequest } from '../../../Domains/purchase-requests/entities/PurchaseRequest';
import { isPurchaseRequestStatus } from '../../../Domains/purchase-requests/purchaseRequestStatus';

export interface PurchaseRequestListQuery {
  limit: number;
  offset: number;
  status?: string;
  destinationOutletId?: string;
  search?: string;
}

/**
 * UseCase: GetPurchaseRequestsUseCase — list + detail (read).
 */
export class GetPurchaseRequestsUseCase {
  constructor(private readonly purchaseRequestRepository: PurchaseRequestRepository) {}

  async list(
    query: PurchaseRequestListQuery,
    companyId: string,
  ): Promise<PurchaseRequestListResult> {
    if (query.status && !isPurchaseRequestStatus(query.status)) {
      throw new Error('PURCHASE_REQUEST.INVALID_STATUS');
    }
    return this.purchaseRequestRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      destinationOutletId: query.destinationOutletId,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<PurchaseRequest> {
    return this.purchaseRequestRepository.getById(id, companyId);
  }
}
