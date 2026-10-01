import {
  CreatePurchaseOrder,
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
 * UseCase: CreatePurchaseOrderUseCase
 *
 * Business flow (procurement-domain doc 26):
 *  1. Validate payload (CreatePurchaseOrder).
 *  2. Load the source PR (company-scoped) and require status APPROVED (§8 MVP).
 *     A PR may spawn more than one PO, so a second PO from the same PR is NOT
 *     blocked.
 *  3. Load the supplier (company-scoped) and require it ACTIVE (§6.1).
 *  4. Resolve the effective payment term (§6.3): explicit paymentTermId from the
 *     body wins; otherwise fall back to the supplier default. When a payment
 *     term is resolved it must belong to the company and be active, and we
 *     snapshot its code/name/dueDays (§6.5). When neither is present, payment
 *     term is null and the due date is null.
 *  5. Compute estimatedPaymentDueDate = orderDate + dueDays (§6.4), backend-only.
 *  6. Resolve items:
 *       - If the body sent items, use them (prices/tax already adjusted by user).
 *       - If the body omitted items, PREFILL from the PR lines: productId,
 *         quantity, uomId carry over; unitPrice defaults to the PR line's
 *         estimatedPrice; taxPercent defaults to 0. The user can edit later.
 *  7. Validate every item product/uom belongs to the company.
 *  8. Compute header totals (Σsubtotal, Σtax, grand) server-side.
 *  9. Persist the DRAFT (repository generates po_number, logs null -> DRAFT).
 *
 * The destination outlet is inherited from the PR (doc 26 §3 — PO destination
 * location), guaranteeing it is consistent with the approved request and used
 * for PO numbering (PO-{outletCode}-YYYY-NNNNNN).
 */
export class CreatePurchaseOrderUseCase {
  constructor(
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly purchaseRequestRepository: PurchaseRequestRepository,
    private readonly supplierRepository: SupplierRepository,
    private readonly paymentTermRepository: PaymentTermRepository,
    private readonly productRepository: ProductRepository,
    private readonly uomRepository: UomRepository,
  ) {}

  async execute(
    payload: unknown,
    companyId: string,
    userId: string | null,
  ): Promise<PurchaseOrder> {
    const draft = new CreatePurchaseOrder(payload);

    // 2. Source PR must exist in the company and be APPROVED.
    const pr = await this.purchaseRequestRepository.getById(draft.purchaseRequestId, companyId);
    if (pr.status !== 'APPROVED') {
      throw new Error('PURCHASE_ORDER.PR_NOT_APPROVED');
    }

    // 3. Supplier must exist in the company and be active.
    const supplier = await this.supplierRepository.getSupplierById(draft.supplierId, companyId);
    if (!supplier.isActive) {
      throw new Error('PURCHASE_ORDER.SUPPLIER_INACTIVE');
    }

    // 4. Resolve the effective payment term + snapshot.
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
      // A user-selected payment term must be active; an inactive supplier
      // default is not auto-applied either (doc 26 §7 — inactive terms are not
      // selectable for new documents).
      if (!paymentTerm.isActive) {
        throw new Error('PURCHASE_ORDER.PAYMENT_TERM_INACTIVE');
      }
      paymentTermId = paymentTerm.id;
      paymentTermCode = paymentTerm.code;
      paymentTermName = paymentTerm.name;
      paymentTermDueDays = paymentTerm.dueDays;
    }

    // 5. Backend-computed estimated payment due date.
    const estimatedPaymentDueDate = computeEstimatedPaymentDueDate(
      draft.orderDate,
      paymentTermDueDays,
    );

    // 6. Resolve items (provided vs prefilled from PR).
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

    // 7. Company-scope validation of item references.
    const productIds = [...new Set(items.map((i) => i.productId))];
    const uomIds = [...new Set(items.map((i) => i.uomId))];
    await Promise.all(productIds.map((id) => this.productRepository.getProductById(id, companyId)));
    await Promise.all(uomIds.map((id) => this.uomRepository.getUomById(id, companyId)));

    // 8. Header totals (server-side).
    const totalAmount = roundMoney(items.reduce((sum, i) => sum + i.subtotal, 0));
    const taxTotal = roundMoney(items.reduce((sum, i) => sum + i.taxAmount, 0));
    const grandTotal = roundMoney(totalAmount + taxTotal);

    // 9. Persist DRAFT. destinationOutlet inherited from the PR.
    return this.purchaseOrderRepository.createDraft(companyId, userId, {
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
