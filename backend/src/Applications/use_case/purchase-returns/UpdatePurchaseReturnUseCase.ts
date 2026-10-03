import { CreatePurchaseReturn } from '../../../Domains/purchase-returns/entities/CreatePurchaseReturn';
import { PurchaseReturn } from '../../../Domains/purchase-returns/entities/PurchaseReturn';
import { PurchaseReturnRepository } from '../../../Domains/purchase-returns/PurchaseReturnRepository';
import { GoodsReceiptRepository } from '../../../Domains/goods-receipts/GoodsReceiptRepository';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';
import { OutletRepository } from '../../../Domains/outlets/OutletRepository';
import { resolveReturnItems } from './CreatePurchaseReturnUseCase';

/**
 * UseCase: UpdatePurchaseReturnUseCase — replace a DRAFT return (doc 26 §6).
 *
 * Mirrors create: re-validates the payload, re-loads the source GR (COMPLETED)
 * and its returnable lines, re-inherits supplier/outlet snapshots, re-maps the
 * items (membership + returnable quota), and asks the repository to replace the
 * DRAFT header + items. The repository rejects a non-editable (non-DRAFT) status
 * with PURCHASE_RETURN.ONLY_EDITABLE_STATUS.
 *
 * The source GR is re-derived from the payload (a DRAFT return may be re-pointed
 * to another COMPLETED GR of the same company). Snapshots are always refreshed
 * from the current GR so an edited draft never carries stale references.
 */
export class UpdatePurchaseReturnUseCase {
  constructor(
    private readonly purchaseReturnRepository: PurchaseReturnRepository,
    private readonly goodsReceiptRepository: GoodsReceiptRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly outletRepository: OutletRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseReturn> {
    const draft = new CreatePurchaseReturn(payload);

    const gr = await this.goodsReceiptRepository.getById(draft.goodsReceiptId, companyId);
    const returnableLines = await this.purchaseReturnRepository.getReturnable(
      draft.goodsReceiptId,
      companyId,
    );

    const supplier = await this.supplierRepository.getSupplierById(gr.supplierId, companyId);
    const outlet = await this.outletRepository.getOutletById(
      gr.destinationOutletId,
      companyId,
    );

    const items = resolveReturnItems(draft.items, returnableLines);

    return this.purchaseReturnRepository.updateDraft(id, companyId, userId, {
      goodsReceiptId: gr.id,
      purchaseOrderId: gr.purchaseOrderId,
      supplierId: supplier.id,
      supplierCode: supplier.code,
      supplierName: supplier.name,
      outletId: outlet.id,
      outletCode: outlet.code,
      outletName: outlet.name,
      returnDate: draft.returnDate,
      notes: draft.notes,
      items,
    });
  }
}
