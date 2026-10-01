import {
  GoodsReceiptRepository,
  GoodsReceiptListResult,
} from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { GoodsReceipt } from '../../../Domains/goods-receipts/entities/GoodsReceipt';
import { isGoodsReceiptStatus } from '../../../Domains/goods-receipts/goodsReceiptStatus';

export interface GoodsReceiptListQuery {
  limit: number;
  offset: number;
  status?: string;
  purchaseOrderId?: string;
  supplierId?: string;
  destinationOutletId?: string;
  search?: string;
}

/**
 * UseCase: GetGoodsReceiptsUseCase — list + detail (read).
 */
export class GetGoodsReceiptsUseCase {
  constructor(private readonly goodsReceiptRepository: GoodsReceiptRepository) {}

  async list(
    query: GoodsReceiptListQuery,
    companyId: string,
  ): Promise<GoodsReceiptListResult> {
    if (query.status && !isGoodsReceiptStatus(query.status)) {
      throw new Error('GOODS_RECEIPT.INVALID_STATUS');
    }
    return this.goodsReceiptRepository.list(companyId, {
      limit: query.limit,
      offset: query.offset,
      status: query.status,
      purchaseOrderId: query.purchaseOrderId,
      supplierId: query.supplierId,
      destinationOutletId: query.destinationOutletId,
      search: query.search,
    });
  }

  async detail(id: string, companyId: string): Promise<GoodsReceipt> {
    return this.goodsReceiptRepository.getById(id, companyId);
  }
}
