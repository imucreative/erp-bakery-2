import { CreatePurchaseOrderUseCase } from '../CreatePurchaseOrderUseCase';
import { UpdatePurchaseOrderUseCase } from '../UpdatePurchaseOrderUseCase';
import { SubmitPurchaseOrderUseCase } from '../SubmitPurchaseOrderUseCase';
import { ApprovePurchaseOrderUseCase } from '../ApprovePurchaseOrderUseCase';
import { RejectPurchaseOrderUseCase } from '../RejectPurchaseOrderUseCase';
import { CancelPurchaseOrderUseCase } from '../CancelPurchaseOrderUseCase';
import { GetPurchaseOrdersUseCase } from '../GetPurchaseOrdersUseCase';
import { GetPurchaseOrderOutstandingUseCase } from '../GetPurchaseOrderOutstandingUseCase';
import { AddPurchaseOrderCommentUseCase } from '../AddPurchaseOrderCommentUseCase';
import { GetPurchaseOrderCommentsUseCase } from '../GetPurchaseOrderCommentsUseCase';
import { PurchaseOrderRepository } from '../../../../Domains/purchase-orders/PurchaseOrderRepository';
import { PurchaseRequestRepository } from '../../../../Domains/purchase-requests/PurchaseRequestRepository';
import { SupplierRepository } from '../../../../Domains/suppliers/SupplierRepository';
import { PaymentTermRepository } from '../../../../Domains/payment-terms/PaymentTermRepository';
import { ProductRepository } from '../../../../Domains/products/ProductRepository';
import { UomRepository } from '../../../../Domains/uoms/UomRepository';

const poRepo: jest.Mocked<PurchaseOrderRepository> = {
  createDraft: jest.fn(),
  updateDraft: jest.fn(),
  getById: jest.fn(),
  list: jest.fn(),
  getConsumedQtyByPrItem: jest.fn(),
  submit: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  cancel: jest.fn(),
  ensureExists: jest.fn(),
  addComment: jest.fn(),
  listComments: jest.fn(),
} as unknown as jest.Mocked<PurchaseOrderRepository>;

const prRepo: jest.Mocked<PurchaseRequestRepository> = {
  getById: jest.fn(),
} as unknown as jest.Mocked<PurchaseRequestRepository>;

const supplierRepo: jest.Mocked<SupplierRepository> = {
  getSupplierById: jest.fn(),
} as unknown as jest.Mocked<SupplierRepository>;

const paymentTermRepo: jest.Mocked<PaymentTermRepository> = {
  getPaymentTermById: jest.fn(),
} as unknown as jest.Mocked<PaymentTermRepository>;

const productRepo: jest.Mocked<ProductRepository> = {
  getProductById: jest.fn(),
} as unknown as jest.Mocked<ProductRepository>;

const uomRepo: jest.Mocked<UomRepository> = {
  getUomById: jest.fn(),
} as unknown as jest.Mocked<UomRepository>;

/** An APPROVED PR with two lines, used as the valid source for PO creation. */
function approvedPr(over: Record<string, unknown> = {}) {
  return {
    id: 'pr-1',
    companyId: 'c1',
    status: 'APPROVED',
    destinationOutletId: 'outlet-1',
    items: [
      { id: 'pri-1', productId: 'prod-1', quantity: 3, uomId: 'uom-1', estimatedPrice: 5000, subtotal: 15000 },
      { id: 'pri-2', productId: 'prod-2', quantity: 2, uomId: 'uom-1', estimatedPrice: 2500, subtotal: 5000 },
    ],
    ...over,
  };
}

function activeSupplier(over: Record<string, unknown> = {}) {
  return {
    id: 'sup-1',
    companyId: 'c1',
    isActive: true,
    defaultPaymentTermId: null,
    ...over,
  };
}

const basePayload = {
  purchaseRequestId: 'pr-1',
  supplierId: 'sup-1',
  orderDate: '2026-10-05',
  items: [
    { productId: 'prod-1', quantity: 3, uomId: 'uom-1', unitPrice: 5000, taxPercent: 11 },
    { productId: 'prod-2', quantity: 2, uomId: 'uom-1', unitPrice: 2500, taxPercent: 0 },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no sibling PO consumption → outstanding == full PR quantity.
  poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map<string, number>());
});

function createUseCase() {
  return new CreatePurchaseOrderUseCase(
    poRepo,
    prRepo,
    supplierRepo,
    paymentTermRepo,
    productRepo,
    uomRepo,
  );
}

describe('CreatePurchaseOrderUseCase', () => {
  it('should create from an APPROVED PR, computing totals/tax server-side', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    await createUseCase().execute(basePayload, 'c1', 'u1');

    expect(prRepo.getById).toHaveBeenCalledWith('pr-1', 'c1');
    expect(supplierRepo.getSupplierById).toHaveBeenCalledWith('sup-1', 'c1');
    // destination outlet inherited from the PR; totals computed server-side.
    expect(poRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({
        destinationOutletId: 'outlet-1',
        totalAmount: 20000, // 15000 + 5000
        taxTotal: 1650, // 15000 * 11% + 0
        grandTotal: 21650,
        paymentTermId: null,
        estimatedPaymentDueDate: null,
      }),
    );
  });

  it('should reject creation when the PR is not APPROVED', async () => {
    prRepo.getById.mockResolvedValue(approvedPr({ status: 'SUBMITTED' }) as never);

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.PR_NOT_APPROVED',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND for a foreign/missing PR (company-scope)', async () => {
    prRepo.getById.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_REQUEST.NOT_FOUND',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should reject creation when the supplier is inactive', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier({ isActive: false }) as never);

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.SUPPLIER_INACTIVE',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should resolve an explicit payment term, snapshot it, and compute the due date', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    paymentTermRepo.getPaymentTermById.mockResolvedValue({
      id: 'pt-1',
      code: 'NET30',
      name: 'Net 30',
      dueDays: 30,
      isActive: true,
    } as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    await createUseCase().execute({ ...basePayload, paymentTermId: 'pt-1' }, 'c1', 'u1');

    expect(paymentTermRepo.getPaymentTermById).toHaveBeenCalledWith('pt-1', 'c1');
    expect(poRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({
        paymentTermId: 'pt-1',
        paymentTermCode: 'NET30',
        paymentTermName: 'Net 30',
        paymentTermDueDays: 30,
        estimatedPaymentDueDate: '2026-11-04', // 2026-10-05 + 30 days
      }),
    );
  });

  it('should fall back to the supplier default payment term when none is provided', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(
      activeSupplier({ defaultPaymentTermId: 'pt-default' }) as never,
    );
    paymentTermRepo.getPaymentTermById.mockResolvedValue({
      id: 'pt-default',
      code: 'NET14',
      name: 'Net 14',
      dueDays: 14,
      isActive: true,
    } as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    await createUseCase().execute(basePayload, 'c1', 'u1');

    expect(paymentTermRepo.getPaymentTermById).toHaveBeenCalledWith('pt-default', 'c1');
    expect(poRepo.createDraft).toHaveBeenCalledWith(
      'c1',
      'u1',
      expect.objectContaining({ paymentTermId: 'pt-default', paymentTermDueDays: 14 }),
    );
  });

  it('should reject an inactive payment term', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    paymentTermRepo.getPaymentTermById.mockResolvedValue({
      id: 'pt-1',
      code: 'OLD',
      name: 'Old',
      dueDays: 30,
      isActive: false,
    } as never);

    await expect(
      createUseCase().execute({ ...basePayload, paymentTermId: 'pt-1' }, 'c1', 'u1'),
    ).rejects.toThrow('PURCHASE_ORDER.PAYMENT_TERM_INACTIVE');
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should prefill items from the PR when the body omits items (unitPrice=estimatedPrice, tax=0)', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    const { items, ...noItems } = basePayload;
    void items;
    await createUseCase().execute(noItems, 'c1', 'u1');

    const arg = poRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(2);
    expect(arg.items[0]).toEqual(
      expect.objectContaining({
        productId: 'prod-1',
        quantity: 3,
        uomId: 'uom-1',
        unitPrice: 5000,
        taxPercent: 0,
        subtotal: 15000,
        taxAmount: 0,
        total: 15000,
      }),
    );
    // No tax when prefilled, so totals equal subtotals.
    expect(arg.totalAmount).toBe(20000);
    expect(arg.taxTotal).toBe(0);
    expect(arg.grandTotal).toBe(20000);
  });

  it('should validate every item product and uom against the company', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockRejectedValue(new Error('PRODUCT.NOT_FOUND'));

    await expect(createUseCase().execute(basePayload, 'c1', 'u1')).rejects.toThrow(
      'PRODUCT.NOT_FOUND',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  // ── Items locked to the source PR (doc 26 §8) ──────────────────────────
  it('should reject an item whose product is not in the source PR', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-foreign', quantity: 1, uomId: 'uom-1', unitPrice: 100, taxPercent: 0 }],
    };

    await expect(createUseCase().execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.ITEM_NOT_IN_PR',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should reject a duplicate product within one PO', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);

    const payload = {
      ...basePayload,
      items: [
        { productId: 'prod-1', quantity: 1, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 },
        { productId: 'prod-1', quantity: 1, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 },
      ],
    };

    await expect(createUseCase().execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.DUPLICATE_ITEM',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should reject a quantity that exceeds the outstanding (full PR line when no sibling consumption)', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);

    // PR line for prod-1 has quantity 3, nothing consumed → outstanding 3;
    // asking for 4 must fail.
    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 4, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await expect(createUseCase().execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should accept a subset of PR items with quantity <= the PR line (partial PO)', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    // Only prod-1, with a reduced quantity (2 <= PR's 3). prod-2 is omitted.
    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 2, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await createUseCase().execute(payload, 'c1', 'u1');

    const arg = poRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(1);
    expect(arg.items[0]).toEqual(expect.objectContaining({ productId: 'prod-1', quantity: 2 }));
    expect(arg.totalAmount).toBe(10000);
  });

  it('should accept PR-prefilled items (locked to PR by construction)', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);

    const { items, ...noItems } = basePayload;
    void items;
    await createUseCase().execute(noItems, 'c1', 'u1');

    expect(poRepo.createDraft).toHaveBeenCalled();
    const arg = poRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(2);
  });
});

describe('UpdatePurchaseOrderUseCase', () => {
  it('should re-validate and delegate to updateDraft with recomputed totals', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.updateDraft.mockResolvedValue({ id: 'po1' } as never);

    const useCase = new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
    await useCase.execute('po1', basePayload, 'c1', 'u1');

    expect(poRepo.updateDraft).toHaveBeenCalledWith(
      'po1',
      'c1',
      'u1',
      expect.objectContaining({ totalAmount: 20000, taxTotal: 1650, grandTotal: 21650 }),
    );
  });

  it('should reject update items that are not in the source PR', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);

    const useCase = new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-foreign', quantity: 1, uomId: 'uom-1', unitPrice: 100, taxPercent: 0 }],
    };

    await expect(useCase.execute('po1', payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.ITEM_NOT_IN_PR',
    );
    expect(poRepo.updateDraft).not.toHaveBeenCalled();
  });

  it('should reject update when a line quantity exceeds the PR line', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);

    const useCase = new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-2', quantity: 3, uomId: 'uom-1', unitPrice: 2500, taxPercent: 0 }],
    };

    await expect(useCase.execute('po1', payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(poRepo.updateDraft).not.toHaveBeenCalled();
  });

  it('should accept a valid subset update locked to the PR', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.updateDraft.mockResolvedValue({ id: 'po1' } as never);

    const useCase = new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 1, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await useCase.execute('po1', payload, 'c1', 'u1');

    expect(poRepo.updateDraft).toHaveBeenCalledWith(
      'po1',
      'c1',
      'u1',
      expect.objectContaining({ totalAmount: 5000 }),
    );
  });

  it('should propagate ONLY_EDITABLE_STATUS from the repository', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.updateDraft.mockRejectedValue(new Error('PURCHASE_ORDER.ONLY_EDITABLE_STATUS'));

    const useCase = new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
    await expect(useCase.execute('po1', basePayload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.ONLY_EDITABLE_STATUS',
    );
  });
});

describe('Status use cases delegate to the repository', () => {
  it('submit -> repo.submit', async () => {
    poRepo.submit.mockResolvedValue({ id: 'po' } as never);
    await new SubmitPurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1');
    expect(poRepo.submit).toHaveBeenCalledWith('po', 'c1', 'u1');
  });

  it('approve -> repo.approve with trimmed note', async () => {
    poRepo.approve.mockResolvedValue({ id: 'po' } as never);
    await new ApprovePurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1', '  ok  ');
    expect(poRepo.approve).toHaveBeenCalledWith('po', 'c1', 'u1', 'ok');
  });

  it('approve -> allows a null note (no nominal limit)', async () => {
    poRepo.approve.mockResolvedValue({ id: 'po' } as never);
    await new ApprovePurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1', null);
    expect(poRepo.approve).toHaveBeenCalledWith('po', 'c1', 'u1', null);
  });

  it('reject -> requires a note', async () => {
    const useCase = new RejectPurchaseOrderUseCase(poRepo);
    await expect(useCase.execute('po', 'c1', 'u1', null)).rejects.toThrow(
      'REJECT_PURCHASE_ORDER.NOTE_REQUIRED',
    );
    await expect(useCase.execute('po', 'c1', 'u1', '   ')).rejects.toThrow(
      'REJECT_PURCHASE_ORDER.NOTE_REQUIRED',
    );
    expect(poRepo.reject).not.toHaveBeenCalled();
  });

  it('reject -> repo.reject with trimmed note', async () => {
    poRepo.reject.mockResolvedValue({ id: 'po' } as never);
    await new RejectPurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1', '  budget  ');
    expect(poRepo.reject).toHaveBeenCalledWith('po', 'c1', 'u1', 'budget');
  });

  it('cancel -> repo.cancel (note optional)', async () => {
    poRepo.cancel.mockResolvedValue({ id: 'po' } as never);
    await new CancelPurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1', null);
    expect(poRepo.cancel).toHaveBeenCalledWith('po', 'c1', 'u1', null);
  });

  it('should propagate INVALID_STATUS_TRANSITION from the repository', async () => {
    poRepo.submit.mockRejectedValue(new Error('PURCHASE_ORDER.INVALID_STATUS_TRANSITION'));
    await expect(
      new SubmitPurchaseOrderUseCase(poRepo).execute('po', 'c1', 'u1'),
    ).rejects.toThrow('PURCHASE_ORDER.INVALID_STATUS_TRANSITION');
  });
});

describe('GetPurchaseOrdersUseCase', () => {
  it('should throw INVALID_STATUS for an unknown status filter', async () => {
    await expect(
      new GetPurchaseOrdersUseCase(poRepo).list({ limit: 10, offset: 0, status: 'NOPE' }, 'c1'),
    ).rejects.toThrow('PURCHASE_ORDER.INVALID_STATUS');
  });

  it('should list with a valid status and filters', async () => {
    poRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetPurchaseOrdersUseCase(poRepo).list(
      { limit: 10, offset: 0, status: 'SUBMITTED', supplierId: 'sup-1' },
      'c1',
    );
    expect(poRepo.list).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ status: 'SUBMITTED', supplierId: 'sup-1' }),
    );
  });

  it('should pass the receivable picker flag through to the repository', async () => {
    poRepo.list.mockResolvedValue({ rows: [], total: 0 });
    await new GetPurchaseOrdersUseCase(poRepo).list(
      { limit: 10, offset: 0, receivable: true },
      'c1',
    );
    expect(poRepo.list).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ receivable: true }),
    );
  });

  it('should return detail via getById', async () => {
    poRepo.getById.mockResolvedValue({ id: 'po' } as never);
    const result = await new GetPurchaseOrdersUseCase(poRepo).detail('po', 'c1');
    expect(result).toEqual({ id: 'po' });
  });
});

describe('AddPurchaseOrderCommentUseCase', () => {
  it('should default to INTERNAL, verify tenant scope, then persist and return the comment', async () => {
    poRepo.ensureExists.mockResolvedValue(undefined);
    poRepo.addComment.mockResolvedValue({
      id: 'cmt-1',
      category: 'INTERNAL',
      body: 'Please review',
      authorId: 'u1',
      authorName: 'Budi',
      createdAt: new Date('2026-10-01T08:00:00Z'),
    });

    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    const result = await useCase.execute('po1', { body: 'Please review' }, 'c1', 'u1');

    expect(poRepo.ensureExists).toHaveBeenCalledWith('po1', 'c1');
    expect(poRepo.addComment).toHaveBeenCalledWith('po1', 'c1', 'u1', {
      category: 'INTERNAL',
      body: 'Please review',
    });
    expect(result.authorName).toBe('Budi');
  });

  it('should accept an APPROVAL category when explicitly provided', async () => {
    poRepo.ensureExists.mockResolvedValue(undefined);
    poRepo.addComment.mockResolvedValue({ id: 'cmt-1' } as never);

    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    await useCase.execute('po1', { body: 'Approved with note', category: 'APPROVAL' }, 'c1', 'u1');

    expect(poRepo.addComment).toHaveBeenCalledWith(
      'po1',
      'c1',
      'u1',
      { category: 'APPROVAL', body: 'Approved with note' },
    );
  });

  it('should reject an empty body before touching the repository', async () => {
    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    await expect(useCase.execute('po1', { body: '   ' }, 'c1', 'u1')).rejects.toThrow(
      'ADD_PURCHASE_ORDER_COMMENT.BODY_REQUIRED',
    );
    expect(poRepo.ensureExists).not.toHaveBeenCalled();
    expect(poRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject a SYSTEM category coming from user input (backend-only)', async () => {
    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    await expect(
      useCase.execute('po1', { body: 'hi', category: 'SYSTEM' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_ORDER_COMMENT.CATEGORY_NOT_ALLOWED');
    expect(poRepo.addComment).not.toHaveBeenCalled();
  });

  it('should reject an unknown category', async () => {
    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    await expect(
      useCase.execute('po1', { body: 'hi', category: 'NOPE' }, 'c1', 'u1'),
    ).rejects.toThrow('ADD_PURCHASE_ORDER_COMMENT.INVALID_CATEGORY');
    expect(poRepo.addComment).not.toHaveBeenCalled();
  });

  it('should propagate PURCHASE_ORDER.NOT_FOUND when the PO is in another company', async () => {
    poRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));
    const useCase = new AddPurchaseOrderCommentUseCase(poRepo);

    await expect(useCase.execute('po1', { body: 'hi' }, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.NOT_FOUND',
    );
    expect(poRepo.addComment).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseOrderCommentsUseCase', () => {
  it('should verify tenant scope then list the thread', async () => {
    poRepo.ensureExists.mockResolvedValue(undefined);
    poRepo.listComments.mockResolvedValue([]);

    const useCase = new GetPurchaseOrderCommentsUseCase(poRepo);

    await useCase.execute('po1', 'c1');

    expect(poRepo.ensureExists).toHaveBeenCalledWith('po1', 'c1');
    expect(poRepo.listComments).toHaveBeenCalledWith('po1', 'c1');
  });

  it('should propagate PURCHASE_ORDER.NOT_FOUND for a foreign PO', async () => {
    poRepo.ensureExists.mockRejectedValue(new Error('PURCHASE_ORDER.NOT_FOUND'));
    const useCase = new GetPurchaseOrderCommentsUseCase(poRepo);

    await expect(useCase.execute('po1', 'c1')).rejects.toThrow('PURCHASE_ORDER.NOT_FOUND');
    expect(poRepo.listComments).not.toHaveBeenCalled();
  });
});

// ── Outstanding (remaining orderable) quota across POs (2026-10-01 [15:40]) ──
describe('CreatePurchaseOrderUseCase — outstanding quota', () => {
  it('should reject a quantity that exceeds the remaining outstanding when a sibling PO already consumed part of the PR line', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    // prod-1 PR qty 3, a sibling active PO consumed 2 → outstanding 1.
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 2]]));

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 2, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await expect(createUseCase().execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should accept a quantity equal to the remaining outstanding', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);
    // prod-1 PR qty 3, consumed 2 → outstanding 1; ordering exactly 1 succeeds.
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 2]]));

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 1, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await createUseCase().execute(payload, 'c1', 'u1');

    expect(poRepo.getConsumedQtyByPrItem).toHaveBeenCalledWith('pr-1', 'c1');
    expect(poRepo.createDraft).toHaveBeenCalled();
  });

  it('should reject ordering a line whose outstanding is 0 (fully consumed)', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    // prod-1 PR qty 3 fully consumed → outstanding 0.
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 3]]));

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 1, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await expect(createUseCase().execute(payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });

  it('should prefill only outstanding>0 lines with quantity = outstanding when the body omits items', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.createDraft.mockResolvedValue({ id: 'po1' } as never);
    // prod-1: PR 3, consumed 2 → outstanding 1 (prefilled);
    // prod-2: PR 2, consumed 2 → outstanding 0 (dropped from prefill).
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(
      new Map([['prod-1', 2], ['prod-2', 2]]),
    );

    const { items, ...noItems } = basePayload;
    void items;
    await createUseCase().execute(noItems, 'c1', 'u1');

    const arg = poRepo.createDraft.mock.calls[0][2];
    expect(arg.items).toHaveLength(1);
    expect(arg.items[0]).toEqual(
      expect.objectContaining({ productId: 'prod-1', quantity: 1, unitPrice: 5000 }),
    );
  });

  it('should reject create (prefill mode) when every PR line is fully consumed', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(
      new Map([['prod-1', 3], ['prod-2', 2]]),
    );

    const { items, ...noItems } = basePayload;
    void items;
    await expect(createUseCase().execute(noItems, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.NO_OUTSTANDING_ITEMS',
    );
    expect(poRepo.createDraft).not.toHaveBeenCalled();
  });
});

describe('UpdatePurchaseOrderUseCase — outstanding quota excludes the edited PO', () => {
  function updateUseCase() {
    return new UpdatePurchaseOrderUseCase(
      poRepo,
      prRepo,
      supplierRepo,
      paymentTermRepo,
      productRepo,
      uomRepo,
    );
  }

  it('should pass the edited PO id as excludePurchaseOrderId so its own consumption is not counted', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    productRepo.getProductById.mockResolvedValue({ id: 'prod' } as never);
    uomRepo.getUomById.mockResolvedValue({ id: 'uom' } as never);
    poRepo.updateDraft.mockResolvedValue({ id: 'po1' } as never);
    // Only OTHER POs are counted here; this PO (po1) is excluded by the query.
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map<string, number>());

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 3, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await updateUseCase().execute('po1', payload, 'c1', 'u1');

    expect(poRepo.getConsumedQtyByPrItem).toHaveBeenCalledWith('pr-1', 'c1', 'po1');
    expect(poRepo.updateDraft).toHaveBeenCalled();
  });

  it('should reject an update that exceeds the outstanding left by OTHER active POs', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    supplierRepo.getSupplierById.mockResolvedValue(activeSupplier() as never);
    // Another PO consumed 2 of prod-1 (PR 3) → outstanding for this edit is 1.
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 2]]));

    const payload = {
      ...basePayload,
      items: [{ productId: 'prod-1', quantity: 2, uomId: 'uom-1', unitPrice: 5000, taxPercent: 0 }],
    };

    await expect(updateUseCase().execute('po1', payload, 'c1', 'u1')).rejects.toThrow(
      'PURCHASE_ORDER.QTY_EXCEEDS_OUTSTANDING',
    );
    expect(poRepo.updateDraft).not.toHaveBeenCalled();
  });
});

describe('GetPurchaseOrderOutstandingUseCase', () => {
  function outstandingUseCase() {
    return new GetPurchaseOrderOutstandingUseCase(poRepo, prRepo);
  }

  it('should return outstanding = PR qty minus active consumption, with uom/estimatedPrice per line', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    // prod-1 consumed 2 (outstanding 1); prod-2 nothing (outstanding 2).
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 2]]));

    const result = await outstandingUseCase().execute('pr-1', 'c1');

    expect(prRepo.getById).toHaveBeenCalledWith('pr-1', 'c1');
    expect(poRepo.getConsumedQtyByPrItem).toHaveBeenCalledWith('pr-1', 'c1', undefined);
    expect(result.purchaseRequestId).toBe('pr-1');
    expect(result.items).toEqual([
      expect.objectContaining({
        productId: 'prod-1',
        prQuantity: 3,
        consumedQuantity: 2,
        outstandingQuantity: 1,
        uomId: 'uom-1',
        estimatedPrice: 5000,
      }),
      expect.objectContaining({
        productId: 'prod-2',
        prQuantity: 2,
        consumedQuantity: 0,
        outstandingQuantity: 2,
        uomId: 'uom-1',
        estimatedPrice: 2500,
      }),
    ]);
  });

  it('should clamp outstanding at 0 when consumption meets or exceeds the PR qty', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map([['prod-1', 3], ['prod-2', 2]]));

    const result = await outstandingUseCase().execute('pr-1', 'c1');

    expect(result.items.every((i) => i.outstandingQuantity === 0)).toBe(true);
  });

  it('should forward excludePurchaseOrderId for edit mode', async () => {
    prRepo.getById.mockResolvedValue(approvedPr() as never);
    poRepo.getConsumedQtyByPrItem.mockResolvedValue(new Map<string, number>());

    await outstandingUseCase().execute('pr-1', 'c1', 'po-x');

    expect(poRepo.getConsumedQtyByPrItem).toHaveBeenCalledWith('pr-1', 'c1', 'po-x');
  });

  it('should propagate PURCHASE_REQUEST.NOT_FOUND for a foreign/missing PR', async () => {
    prRepo.getById.mockRejectedValue(new Error('PURCHASE_REQUEST.NOT_FOUND'));

    await expect(outstandingUseCase().execute('pr-x', 'c1')).rejects.toThrow(
      'PURCHASE_REQUEST.NOT_FOUND',
    );
    expect(poRepo.getConsumedQtyByPrItem).not.toHaveBeenCalled();
  });
});
