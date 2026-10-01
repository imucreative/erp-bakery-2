import {
  UpdatePurchaseOrder,
} from '../../../Domains/purchase-orders/entities/UpdatePurchaseOrder';
import {
  CreatePurchaseOrderItemInput,
  computeItemMoney,
  computeEstimatedPaymentDueDate,
  roundMoney,
} from '../../../Domains/purchase-orders/entities/CreatePurchaseOrder';
import { PurchaseOrder } from '../../../Domains/purchase-orders/entities/PurchaseOrder';
import { PurchaseOrderRepository } from '../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseRequestRepository } from '../../../Domains/purchase-requests/PurchaseRequestRepository';
import { SupplierRepository } from '../../../Domains/suppliers/SupplierRepository';
import { PaymentTermRepository } from '../../../Domains/payment-terms/PaymentTermRepository';
import { ProductRepository } from '../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../Domains/uoms/UomRepository';

/**
 * UseCase: UpdatePurchaseOrderUseCase — edit an editable PO (DRAFT/REJECTED).
 *
 * Validation and resolution mirror create: the source PR must still be APPROVED,
 * the supplier active, the payment term (explicit or supplier default) active,
 * the due date recomputed, and the money totals recomputed server-side. The
 * repository enforces the editable-status gate and, when the PO was REJECTED,
 * resets it to DRAFT while logging the transition.
 *
 * As with create, items are optional: when omitted they are prefilled from the
 * source PR lines (unitPrice = PR estimatedPrice, taxPercent = 0).
 */
export class UpdatePurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly paymentTermRepository: PaymentTermRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    id: string,
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseOrder> {
    const draft = new UpdatePurchaseOrder(payload);

    const pr = await this.purchaseRequestRepository.getById(draft.purchaseRequestId, companyId);
    if (pr.status !== 'APPROVED') {
      throw new Error('PURCHASE_ORDER.PR_NOT_APPROVED');
    }

    const supplier = await this.supplierRepository.getSupplierById(draft.supplierId, companyId);
    if (!supplier.isActive) {
      throw new Error('PURCHASE_ORDER.SUPPLIER_INACTIVE');
    }

    const effectivePaymentTermId = draft.paymentTermId ?? supplier.defaultPaymentTermId ?? null;
    let paymentTermId: string | null = null;
    let paymentTermCode: string | null = null;
    let paymentTermName: string | null = null;
    let paymentTermDueDays: number | null = null;

    if (effectivePaymentTermId) {
      const paymentTerm = await this.paymentTermRepository.getPaymentTermById(
        effectivePaymentTermId,
        companyId,
      );
      if (!paymentTerm.isActive) {
        throw new Error('PURCHASE_ORDER.PAYMENT_TERM_INACTIVE');
      }
      paymentTermId = paymentTerm.id;
      paymentTermCode = paymentTerm.code;
      paymentTermName = paymentTerm.name;
      paymentTermDueDays = paymentTerm.dueDays;
    }

    const estimatedPaymentDueDate = computeEstimatedPaymentDueDate(
      draft.orderDate,
      paymentTermDueDays,
    );

    const items: CreatePurchaseOrderItemInput[] =
      draft.items ??
      pr.items.map((prItem) =>
        computeItemMoney({
          productId: prItem.productId,
          quantity: prItem.quantity,
          uomId: prItem.uomId,
          unitPrice: prItem.estimatedPrice,
          taxPercent: 0,
        }),
      );

    if (items.length === 0) {
      throw new Error('CREATE_PURCHASE_ORDER.ITEMS_REQUIRED');
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const uomIds = [...new Set(items.map((i) => i.uomId))];
    await Promise.all(productIds.map((pid) => this.productRepository.getProductById(pid, companyId)));
    await Promise.all(uomIds.map((uid) => this.uomRepository.getUomById(uid, companyId)));

    const totalAmount = roundMoney(items.reduce((sum, i) => sum + i.subtotal, 0));
    const taxTotal = roundMoney(items.reduce((sum, i) => sum + i.taxAmount, 0));
    const grandTotal = roundMoney(totalAmount + taxTotal);

    return this.purchaseOrderRepository.updateDraft(id, companyId, userId, {
      purchaseRequestId: draft.purchaseRequestId,
      supplierId: draft.supplierId,
      destinationOutletId: pr.destinationOutletId,
      orderDate: draft.orderDate,
      paymentTermId,
      paymentTermCode,
      paymentTermName,
      paymentTermDueDays,
      estimatedPaymentDueDate,
      items,
      totalAmount,
      taxTotal,
      grandTotal,
      notes: draft.notes,
    });
  }
}
