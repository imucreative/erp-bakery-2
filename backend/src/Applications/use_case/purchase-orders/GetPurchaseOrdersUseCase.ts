import {
  PurchaseOrderRepository,
  PurchaseOrderListResult,
} from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { isPurchaseOrderStatus } from '../../../Domains/purchase-orders/purchaseOrderStatus';

export interface PurchaseOrderListQuery {
  limit: number;
  offset: number;
  status?: string;
  supplierId?: string;
  destinationOutletId?: string;
  purchaseRequestId?: string;
  search?: string;
  /** Picker: only APPROVED POs with remaining receivable quantity (for GR). */
  receivable?: boolean;
}

/**
 * UseCase: GetPurchaseOrdersUseCase — list + detail (read).
 */
export class GetPurchaseOrdersUseCase {
  constructor(private readonly purchaseOrderRepository: PurchaseOrderRepository) {}

  async list(
    query: PurchaseOrderListQuery,
    companyId: string,
  ): Promise<PurchaseOrderListResult> {
    if (query.status && !isPurchaseOrderStatus(query.status)) {
      throw new Error('PURCHASE_ORDER.INVALID_STATUS');
    }
    return this.purchaseOrderRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      supplierId: query.supplierId,
      destinationOutletId: query.destinationOutletId,
      purchaseRequestId: query.purchaseRequestId,
      search: query.search,
      receivable: query.receivable,
    });
  }

  async detail(id: string, companyId: string): Promise<PurchaseOrder> {
    return this.purchaseOrderRepository.getById(id, companyId);
  }
}
